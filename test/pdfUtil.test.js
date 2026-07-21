const test = require('node:test');
const assert = require('node:assert/strict');
const { getLayoutConfig } = require('../server/pdfUtil');

test('layout config scales to the full width with a visible border gutter', () => {
  const rows = [
    ['Employee Name', 'Department', 'Position'],
    ['Value', '', 'Another value']
  ];

  const config = getLayoutConfig(rows, 500);

  assert.equal(config.availableWidth, 500);
  assert.equal(config.colWidths.length, 3);
  assert.equal(config.colWidths.reduce((sum, width) => sum + width, 0), 500);
  assert.equal(config.borderPadding, 2);
  assert.ok(config.colWidths.every((width) => width >= 30));
});
