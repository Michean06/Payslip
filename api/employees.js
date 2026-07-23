const supabase = require('../server/supabaseClient');
const fallbackStore = require('../server/fallbackStore');
const { normalizeEmployee } = require('../server/utils/employeeNormalizer');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

module.exports = async function employeesHandler(req, res) {
  if (req.method && req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const tableName = process.env.SUPABASE_TABLE || 'payroll_records';

  try {
    if (supabase && supabase.__isConfigured) {
      try {
        const result = await supabase.__runWithTimeout(() => supabase.from(tableName).select('*').order('id', { ascending: true }));
        if (!result?.timedOut && !result?.error && result?.data) {
          return sendJson(res, 200, result.data.map(normalizeEmployee));
        }
      } catch (err) {
        console.warn('Supabase employee fetch failed, using fallback store', err);
      }
    }

    return sendJson(res, 200, fallbackStore.listEmployees());
  } catch (err) {
    return sendJson(res, 500, { error: String(err) });
  }
};
