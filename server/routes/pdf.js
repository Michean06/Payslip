const express = require('express');
const supabase = require('../supabaseClient');
const fallbackStore = require('../fallbackStore');
const { generatePayslipPdf } = require('../pdfUtil');
const { normalizeEmployee } = require('../utils/employeeNormalizer');

const router = express.Router();
const tableName = process.env.SUPABASE_TABLE || 'payroll_records';
const bucketName = process.env.SUPABASE_BUCKET || 'payslips';

// POST /api/pdf/generate/:id
router.post('/generate/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let employee = null;

    if (supabase) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (!error && data) employee = normalizeEmployee(data);
      } catch (err) {
        console.warn('Supabase PDF fetch failed, using fallback store', err);
      }
    }

    if (!employee) {
      const fallbackEmployee = fallbackStore.getEmployeeById(id);
      if (fallbackEmployee) employee = normalizeEmployee(fallbackEmployee);
    }
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const buffer = await generatePayslipPdf(employee);
    
    // Try Supabase storage first
    if (supabase && supabase.__isConfigured) {
      try {
        const path = `payslips/${id}.pdf`;
        const { error: uploadErr } = await supabase.storage.from(bucketName).upload(path, buffer, {
          contentType: 'application/pdf',
          upsert: true
        });
        if (!uploadErr) {
          const { data: signedData, error: signedErr } = await supabase.storage.from(bucketName).createSignedUrl(path, 60 * 60);
          if (!signedErr) return res.json({ url: signedData.signedUrl, source: 'supabase' });
        }
      } catch (err) {
        console.warn('Supabase storage failed, using base64 fallback', err);
      }
    }

    // Fallback: return base64-encoded PDF in JSON
    const base64 = buffer.toString('base64');
    res.json({ 
      base64, 
      source: 'fallback', 
      filename: `payslip-${id}.pdf`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
