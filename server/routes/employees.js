const express = require('express');
const supabase = require('../supabaseClient');
const fallbackStore = require('../fallbackStore');
const { normalizeEmployee } = require('../utils/employeeNormalizer');
const router = express.Router();
const tableName = process.env.SUPABASE_TABLE || 'payroll_records';

router.get('/', async (req, res) => {
  try {
    if (supabase && supabase.__isConfigured) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').order('id', { ascending: true });
        if (!error && data) return res.json(data.map(normalizeEmployee));
        console.warn('Falling back to in-memory employee store', error);
      } catch (err) {
        console.warn('Supabase employee fetch failed, using fallback store', err);
      }
    }

    res.json(fallbackStore.listEmployees());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
