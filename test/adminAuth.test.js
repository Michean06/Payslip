const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { requireAdminAuthIfConfigured } = require('../server/middleware/adminAuth');

function startServer() {
  const app = express();
  app.use(requireAdminAuthIfConfigured);
  app.get('/', (req, res) => {
    res.json({ ok: true });
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('allows localhost requests without a bearer token when auth is configured', async () => {
  const previousToken = process.env.ADMIN_AUTH_TOKEN;
  process.env.ADMIN_AUTH_TOKEN = 'test-secret';

  const server = await startServer();
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: {
        Origin: 'http://localhost:5173'
      }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (previousToken === undefined) {
      delete process.env.ADMIN_AUTH_TOKEN;
    } else {
      process.env.ADMIN_AUTH_TOKEN = previousToken;
    }
  }
});
