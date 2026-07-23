const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGmailTransportConfig } = require('../server/routes/email');

test('gmail transport config disables TLS verification for this environment', () => {
  const config = buildGmailTransportConfig({
    gmailUser: 'sender@example.com',
    gmailAppPassword: 'secret'
  });

  assert.equal(config.service, 'gmail');
  assert.deepEqual(config.auth, {
    user: 'sender@example.com',
    pass: 'secret'
  });
  assert.deepEqual(config.tls, {
    rejectUnauthorized: false
  });
});
