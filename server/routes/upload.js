const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const supabase = require('../supabaseClient');
const fallbackStore = require('../fallbackStore');
const { mapImportField, resolveTableFieldName } = require('../utils/employeeNormalizer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const tableName = process.env.SUPABASE_TABLE || 'payroll_records';
const bucketName = process.env.SUPABASE_BUCKET || 'payslips';

async function getTableColumns(tableName) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('get_table_columns', { target_table: tableName });
    if (!error && Array.isArray(data) && data.length) {
      return data.map((column) => String(column.column_name || '').trim()).filter(Boolean);
    }
  } catch (err) {
    console.warn('get_table_columns RPC failed', err.message || err);
  }

  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    if (!error && Array.isArray(data) && data.length) {
      return Object.keys(data[0]).map((key) => String(key).trim());
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
  // Excel serial to JS date: days since 1899-12-30 -> convert via 25569 offset to UNIX epoch
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function sanitizeValue(value, targetField) {
  if (value === null || value === undefined) return null;

  // If target field looks like a date column and value is numeric, convert Excel serial
  const isDateField = typeof targetField === 'string' && /date/.test(targetField.toLowerCase());

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    // numeric-looking strings
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
router.post('/', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // parse excel
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Map the downloadable template's labels to the corresponding database fields.
    function normalizeCellRow(row) {
      const normalized = {};
      Object.entries(row).forEach(([key, value]) => {
        const label = String(key || '').trim();
        if (!label || /^(__EMPTY(?:_\d+)?|_+\d*)$/i.test(label)) return;
        const rawName = HEADER_TO_COLUMN[label] || label
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        const name = mapImportField(rawName);

        if (value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value))) {
          normalized[name] = Number(value);
        } else {
          normalized[name] = value;
        }
      });
      return normalized;
    }

    const existingColumns = await getTableColumns(tableName);
    const columnLookup = buildColumnLookup(existingColumns);
    const employees = rows.map((r) => remapRowToColumns(r, columnLookup));

    let inserted = null;
    let useFallback = !supabase;

    if (supabase) {
      try {
        const { data, error } = await supabase.from(tableName).insert(employees).select();
        if (error) {
          console.error('Supabase insert error', error);

          // Detect Row Level Security (RLS) violation errors and give clearer guidance
          const msg = String(error.message || '');
          if (/row-level security|violates row-level security/i.test(msg)) {
            const serverKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
            const guidance = serverKeySet
              ? `Supabase rejected the insert due to RLS. Check the table's row-level policies in the Supabase dashboard for \"${tableName}\".`
              : `The server is not using a Supabase service-role key. Set SUPABASE_SERVICE_ROLE_KEY in your environment (see .env.example) and restart the server, or update the table's RLS policies to allow inserts.`;
            return res.status(502).json({ error: `Supabase schema needs updating. ${guidance}`, table: tableName });
          }

          const missingColumn = /Could not find the '([^']+)' column/i.exec(msg);
          const guidance = missingColumn
            ? `The ${tableName} table is missing the required '${missingColumn[1]}' column. Run the updated schema.sql in the Supabase SQL Editor, then retry the import.`
            : msg || String(error);
          return res.status(502).json({ error: `Supabase schema needs updating. ${guidance}`, table: tableName });
        } else {
          inserted = data;
        }
      } catch (err) {
        console.error('Supabase insert exception', err);
        return res.status(502).json({ error: `Supabase insert failed: ${err.message || String(err)}`, table: tableName });
      }
    }

    const fileName = `uploads/${Date.now()}-${file.originalname}`;
    if (supabase) {
      try {
        const { error: storageError } = await supabase.storage.from(bucketName).upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });
        if (storageError) console.warn('Storage upload warning', storageError.message || storageError);
      } catch (err) {
        console.warn('Storage upload exception', err);
      }
    }

    const fallbackEmployees = useFallback ? fallbackStore.addEmployees(employees) : null;
    const response = {
      inserted: inserted || fallbackEmployees,
      uploaded: fileName,
      source: inserted ? 'supabase' : 'fallback',
      warning: useFallback ? 'Supabase is not configured; saved locally instead.' : undefined
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
