import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApiUrl, getEmailButtonLabel } from '../src/utils/uiHelpers.mjs';

test('buildApiUrl trims trailing slashes and joins a path', () => {
  assert.equal(buildApiUrl('https://example.com/', '/api/employees'), 'https://example.com/api/employees');
  assert.equal(buildApiUrl('https://example.com', 'api/employees'), 'https://example.com/api/employees');
});

test('getEmailButtonLabel reflects sent and editable states', () => {
  assert.equal(getEmailButtonLabel({ alreadySent: true, isEditable: false }), 'Email has been sent');
  assert.equal(getEmailButtonLabel({ alreadySent: false, isEditable: true }), 'Send Again');
  assert.equal(getEmailButtonLabel({ alreadySent: false, isEditable: false }), 'Email');
});
