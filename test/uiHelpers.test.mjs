import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApiUrl, getApiCandidates, getEmailButtonLabel, parseResponsePayload } from '../src/utils/uiHelpers.mjs';

test('buildApiUrl trims trailing slashes and joins a path', () => {
  assert.equal(buildApiUrl('https://example.com/', '/api/employees'), 'https://example.com/api/employees');
  assert.equal(buildApiUrl('https://example.com', 'api/employees'), 'https://example.com/api/employees');
});

test('getEmailButtonLabel reflects sent and editable states', () => {
  assert.equal(getEmailButtonLabel({ alreadySent: true, isEditable: false }), 'Email has been sent');
  assert.equal(getEmailButtonLabel({ alreadySent: false, isEditable: true }), 'Send Again');
  assert.equal(getEmailButtonLabel({ alreadySent: false, isEditable: false }), 'Email');
});

test('parseResponsePayload converts HTML fallback into a friendly error payload', async () => {
  const payload = await parseResponsePayload({
    ok: false,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => '<!doctype html><html><body>fallback</body></html>'
  });

  assert.deepEqual(payload, { error: 'The API endpoint responded with an unexpected page. Please refresh or try again later.' });
});

test('getApiCandidates adds local port 3000 fallbacks for localhost', () => {
  const originalLocation = globalThis.window;
  globalThis.window = { location: { hostname: 'localhost', origin: 'http://localhost:5173' } };

  try {
    const candidates = getApiCandidates('', '/api/upload');
    assert.ok(candidates.includes('http://localhost:3000/api/upload'));
    assert.ok(candidates.includes('http://127.0.0.1:3000/api/upload'));
  } finally {
    globalThis.window = originalLocation;
  }
});
