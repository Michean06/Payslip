const supabase = require('../server/supabaseClient') || require('../server/supabaseClient');
const fallbackStore = require('../server/fallbackStore') || require('../server/fallbackStore');
const { normalizeEmployee } = require('../server/utils/employeeNormalizer') || require('../server/utils/employeeNormalizer');

const tableName = process.env.SUPABASE_TABLE || 'payroll_records';

module.exports = async (req, res) => {
  try {
    if (supabase) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').order('id', { ascending: true });
        if (!error && data) {
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.status(200).end(JSON.stringify(data.map(normalizeEmployee)));
          return;
        }
        // fall through to fallback
        // eslint-disable-next-line no-console
        console.warn('Falling back to in-memory employee store', error);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Supabase employee fetch failed, using fallback store', err && err.stack ? err.stack : err);
      }
    }

    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.status(200).end(JSON.stringify(fallbackStore.listEmployees()));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: String(err) }));
  }
};
