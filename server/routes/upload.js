const express = require('express');
const xlsx = require('xlsx');
const supabase = require('../supabaseClient');
const { resolveTableFieldName } = require('../utils/employeeNormalizer');
const { parseMultipartUpload } = require('../utils/uploadParser');
const { requireAdminAuthIfConfigured } = require('../middleware/adminAuth');

const router = express.Router();
const tableName = process.env.SUPABASE_TABLE || 'payroll_records';
const bucketName = process.env.SUPABASE_BUCKET || 'payslips';
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);

async function getTableColumns(tableName) {
  if (!supabase || !supabase.__isConfigured) return [];
  try {
    const rpcResult = await supabase.__runWithTimeout(() => supabase.rpc('get_table_columns', { target_table: tableName }));
    if (!rpcResult?.timedOut && !rpcResult?.error && Array.isArray(rpcResult?.data) && rpcResult.data.length) {
      return rpcResult.data.map((column) => String(column.column_name || '').trim()).filter(Boolean);
    }
  } catch (err) {
    console.warn('get_table_columns RPC failed', err.message || err);
  }

  try {
    const fallbackResult = await supabase.__runWithTimeout(() => supabase.from(tableName).select('*').limit(1));
    if (!fallbackResult?.timedOut && !fallbackResult?.error && Array.isArray(fallbackResult?.data) && fallbackResult.data.length) {
      return Object.keys(fallbackResult.data[0]).map((key) => String(key).trim());
    }
  } catch (err) {
    console.warn('Table column fallback failed', err.message || err);
  }

  return [];
}

function buildColumnLookup(columns) {
  const lookup = new Map();
  columns.forEach((column) => {
    const lower = String(column || '').trim().toLowerCase();
    if (lower) lookup.set(lower, column);
  });
  return lookup;
}

function excelSerialToISO(serial) {
  const n = Number(serial);
  if (Number.isNaN(n)) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function sanitizeValue(value, targetField) {
  if (value === null || value === undefined) return null;
  const isDateField = typeof targetField === 'string' && /date/.test(targetField.toLowerCase());

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (!Number.isNaN(Number(trimmed))) {
      if (isDateField) return excelSerialToISO(trimmed);
      return Number(trimmed);
    }
    return trimmed;
  }

  if (typeof value === 'number') {
    if (isDateField) return excelSerialToISO(value);
    return value;
  }

  if (!Number.isNaN(Number(value))) {
    if (isDateField) return excelSerialToISO(value);
    return Number(value);
  }

  return value;
}

function remapRowToColumns(row, columnLookup) {
  const normalized = {};
  Object.entries(row).forEach(([key, value]) => {
    const label = String(key || '').trim();
    if (!label || /^(__EMPTY(?:_\d+)?|_+\d*)$/i.test(label)) return;
    const rawName = HEADER_TO_COLUMN[label] || label
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    const tableNameKey = resolveTableFieldName(rawName, columnLookup);
    if (!tableNameKey) return;

    normalized[tableNameKey] = sanitizeValue(value, tableNameKey);
  });
  return normalized;
}

const HEADER_TO_COLUMN = {
  'HeadCount': 'headcount',
  'Pay Date': 'pay_date',
  'Attendance Period': 'attendance_period',
  'Employee ID': 'employee_id',
  'Employee Name': 'employee_name',
  Department: 'department',
  Position: 'position',
  'People Group': 'people_group',
  Location: 'location',
  'SSS #': 'sss_number',
  'PHIC #': 'phic_number',
  'HDMF #': 'hdmf_number',
  'Wage Category': 'wage_category',
  'Payroll Period': 'payroll_period',
  'Annual Working Days': 'annual_working_days',
  'Monthly Basic Pay': 'monthly_basic_pay',
  'Daily Rate': 'daily_rate',
  'No. of Days Worked': 'days_worked',
  'Pay for the Period (Semi-Monthly Basic Pay)': 'semi_monthly_basic_pay',
  'Taxable Allowances': 'taxable_allowances',
  Overtime: 'overtime_pay',
  'Holiday Pay': 'holiday_pay',
  'Variable Performance Incentives': 'variable_performance_incentives',
  'Taxable Salary Adjustment (+)': 'taxable_salary_adjustment',
  'GROSS TAXABLE EARNINGS': 'gross_taxable_earnings',
  'Tardiness / Undertime  (No Pay)': 'tardiness_undertime',
  'Leave Without Pay (LWOP)': 'leave_without_pay',
  'Salary Adjustment (−, overpayment correction)': 'salary_adjustment_deduction',
  'SSS (Employee Share)': 'sss_employee_share',
  'PhilHealth (Employee Share)': 'philhealth_employee_share',
  'Pag-IBIG (Employee Share)': 'pagibig_employee_share',
  'NET TAXABLE COMPENSATION': 'net_taxable_compensation',
  'Semi-Monthly Withholding Tax (TRAIN 2023 onwards)': 'withholding_tax',
  'NET PAY (Before Benefits & Loans)': 'net_pay_before_benefits',
  'Medical Cash Allowance': 'medical_cash_allowance',
  'Rice Subsidy': 'rice_subsidy',
  'Laundry Allowance': 'laundry_allowance',
  'Tax Refund': 'tax_refund',
  'Cash Bond/Insurance': 'cash_bond_insurance',
  'Salary Advance': 'salary_advance',
  '13th Month Advance': 'thirteenth_month_advance',
  'SSS Loan': 'sss_loan',
  'Pag-Ibig Loan': 'pagibig_loan',
  'FINAL TAKE-HOME PAY\n(Released to Employee)': 'final_take_home_pay',
  STATUS: 'status',
  'Bank Name': 'bank_name',
  'Account Number': 'account_number',
  'Payment Date': 'payment_date',
  'Paid By': 'paid_by',
  'Email Address': 'email_address'
};

// POST /api/upload (multipart/form-data) field name: file
router.post('/', requireAdminAuthIfConfigured, async (req, res) => {
  try {
    if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
      return res.status(415).json({ error: 'Expected multipart/form-data upload.' });
    }

    if (!supabase || !supabase.__isConfigured) {
      return res.status(503).json({
        error: 'Upload failed because Supabase is not configured. Set SUPABASE_URL and a Supabase API key, then restart the server.',
        configured: false
      });
    }

    const { file } = await parseMultipartUpload(req, { maxFileSize: maxUploadBytes });
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: 'The uploaded workbook is empty or unreadable.' });
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) {
      return res.status(400).json({ error: 'No rows were found in the uploaded file.' });
    }

    const existingColumns = await getTableColumns(tableName);
    const columnLookup = buildColumnLookup(existingColumns);
    const employees = rows.map((row) => remapRowToColumns(row, columnLookup)).filter(Boolean);
    if (!employees.length) {
      return res.status(400).json({ error: 'The uploaded file did not produce any valid payroll rows.' });
    }

    let data;
    let error;
    try {
      const insertResult = await supabase.__runWithTimeout(() => supabase.from(tableName).insert(employees).select());
      if (insertResult?.timedOut) {
        return res.status(502).json({
          error: 'Upload failed because Supabase did not respond in time.',
          table: tableName
        });
      }
      ({ data, error } = insertResult || {});
    } catch (insertErr) {
      console.error('Supabase insert exception', insertErr);
      const detail = insertErr?.message || String(insertErr || '');
      return res.status(502).json({
        error: `Upload failed while contacting Supabase. ${detail}`,
        table: tableName
      });
    }

    if (error) {
      console.error('Supabase insert error', error);
      const msg = String(error.message || '');
      const details = error.details ? String(error.details) : '';
      const hint = error.hint ? String(error.hint) : '';
      const combinedDetails = [msg, details, hint].filter(Boolean).join(' ');

      if (/row-level security|violates row-level security/i.test(msg)) {
        const serverKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
        const guidance = serverKeySet
          ? `Supabase rejected the insert due to RLS. Check the table's row-level policies in the Supabase dashboard for "${tableName}".`
          : `The server is not using a Supabase service-role key. Set SUPABASE_SERVICE_ROLE_KEY in your environment (see .env.example) and restart the server, or update the table's RLS policies to allow inserts.`;
        return res.status(502).json({ error: `Supabase schema needs updating. ${guidance}`, table: tableName, details: combinedDetails });
      }

      const missingColumn = /Could not find the '([^']+)' column/i.exec(msg);
      const guidance = missingColumn
        ? `The ${tableName} table is missing the required '${missingColumn[1]}' column. Run the updated schema.sql in the Supabase SQL Editor, then retry the import.`
        : combinedDetails || msg || String(error);
      return res.status(502).json({ error: `Supabase schema needs updating. ${guidance}`, table: tableName, details: combinedDetails });
    }

    const safeFileName = String(file.originalname || 'upload').replace(/[^\w.-]+/g, '_');
    const fileName = `uploads/${Date.now()}-${safeFileName}`;
    try {
      const storageResult = await supabase.__runWithTimeout(() => supabase.storage.from(bucketName).upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      }));
      if (storageResult?.timedOut) {
        console.warn('Storage upload timed out');
      } else if (storageResult?.error) {
        console.warn('Storage upload warning', storageResult.error.message || storageResult.error);
      }
    } catch (err) {
      console.warn('Storage upload exception', err);
    }

    return res.json({
      inserted: data,
      uploaded: fileName,
      source: 'supabase'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
