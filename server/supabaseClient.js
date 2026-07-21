const { createClient } = require('@supabase/supabase-js');

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  return url.replace(/\/rest\/v1\/?$/, '').trim();
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
// Prefer the service role key on the server when available (highest privilege).
// Fallback order: SUPABASE_SERVICE_ROLE_KEY -> SUPABASE_KEY -> SUPABASE_ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase environment values are missing. Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = supabase;
