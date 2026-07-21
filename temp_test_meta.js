require('dotenv').config();
const supabase = require('./server/supabaseClient');
(async () => {
  try {
    const { data, error } = await supabase.from('pg_catalog.pg_tables').select('schemaname, tablename').limit(50);
    console.log('META', error ? JSON.stringify(error) : 'OK', data);
  } catch (err) {
    console.error('EX', err);
  }
})();
