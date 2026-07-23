const test = require('node:test');
const assert = require('node:assert/strict');

const supabaseClientPath = '../server/supabaseClient';

test('placeholder Supabase values are treated as unconfigured', () => {
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };

  process.env.SUPABASE_URL = 'https://your-project.supabase.co';
  process.env.SUPABASE_KEY = 'your-anon-or-public-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key';
  process.env.SUPABASE_ANON_KEY = '';

  delete require.cache[require.resolve(supabaseClientPath)];
  const supabaseClient = require(supabaseClientPath);

  assert.equal(supabaseClient.__isConfigured, false);

  Object.entries(originalEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
  delete require.cache[require.resolve(supabaseClientPath)];
});
