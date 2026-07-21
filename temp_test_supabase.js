require('dotenv').config();
const supabase = require('./server/supabaseClient');
(async () => {
  const testTables = ['employees','payslips'];
  for (const table of testTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      console.log('TABLE', table, error ? JSON.stringify(error) : 'OK', 'DATA_LEN', data ? data.length : null);
    } catch (err) {
      console.log('TABLE', table, 'EXCEPTION', err);
    }
  }
})();
