const { createClient } = require('@supabase/supabase-js');

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  return String(url).replace(/\/rest\/v1\/?$/, '').trim();
}

function looksLikePlaceholderValue(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  return normalized.includes('your-project')
    || normalized.includes('your-')
    || normalized.includes('example')
    || normalized.includes('placeholder')
    || normalized.includes('changeme')
    || normalized.includes('change-me');
}

function isSupabaseUrlConfigured(url) {
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return !looksLikePlaceholderValue(hostname) && !looksLikePlaceholderValue(url);
  } catch {
    return !looksLikePlaceholderValue(url);
  }
}

const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL);
// Prefer the service role key on the server when available (highest privilege).
// Fallback order: SUPABASE_SERVICE_ROLE_KEY -> SUPABASE_KEY -> SUPABASE_ANON_KEY
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const hasRealConfig = Boolean(supabaseUrl && supabaseKey && isSupabaseUrlConfigured(supabaseUrl) && !looksLikePlaceholderValue(supabaseKey));

if (!hasRealConfig) {
  console.warn('Supabase environment values are missing or still use placeholder defaults. Set a real SUPABASE_URL and a non-placeholder API key before uploading.');
}

const supabase = hasRealConfig ? createClient(supabaseUrl, supabaseKey) : null;
const exportedClient = supabase || {
  __isConfigured: false,
  from() {
    throw new Error('Supabase is not configured.');
  },
  storage: {
    from() {
      throw new Error('Supabase storage is not configured.');
    }
  },
  rpc() {
    throw new Error('Supabase is not configured.');
  }
};

exportedClient.__isConfigured = hasRealConfig;
module.exports = exportedClient;
