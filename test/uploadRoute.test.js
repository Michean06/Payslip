const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const FormData = require('form-data');

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('upload rejects when Supabase is not configured', async () => {
  const originalEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
  };

  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_KEY = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';

  delete require.cache[require.resolve('../server/supabaseClient')];
  delete require.cache[require.resolve('../server/routes/upload')];

  const uploadRouter = require('../server/routes/upload');
  const app = express();
  app.use('/api/upload', uploadRouter);

  const server = await startServer(app);
  try {
    const { port } = server.address();
    const form = new FormData();
    form.append('file', Buffer.from('not a real workbook'), {
      filename: 'test.xlsx',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const response = await new Promise((resolve, reject) => {
      form.submit(`http://127.0.0.1:${port}/api/upload`, (error, res) => {
        if (error) return reject(error);
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
    });

    assert.equal(response.statusCode, 503);
    const payload = JSON.parse(response.body);
    assert.match(payload.error, /Supabase/i);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    delete require.cache[require.resolve('../server/supabaseClient')];
    delete require.cache[require.resolve('../server/routes/upload')];
  }
});
