require('dotenv').config();
const supabase = require('./server/supabaseClient');
(async () => {
  try {
    const { data, error } = await supabase.from('information_schema.tables').select('table_schema, table_name').limit(50);
    console.log('META', error ? JSON.stringify(error) : 'OK', data);
  } catch (err) {
    console.error('EX', err);
  }
})();
