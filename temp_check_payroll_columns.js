require('dotenv').config();
const supabase = require('./server/supabaseClient');
(async () => {
  if (!supabase) {
    console.error('no supabase');
    process.exit(1);
  }
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name,data_type,is_nullable,ordinal_position')
    .eq('table_name', 'payroll_records')
    .order('ordinal_position', { ascending: true });
  console.log(JSON.stringify({ data, error }, null, 2));
})();
