const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('package.json exposes a Vercel-compatible entrypoint', () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(pkg.main, 'package.json should define a main entrypoint');
  const entrypointPath = path.join(__dirname, '..', pkg.main);
  assert.ok(fs.existsSync(entrypointPath), `Expected entrypoint to exist at ${pkg.main}`);
});
