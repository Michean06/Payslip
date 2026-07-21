const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'public', 'dist');
const indexPath = path.join(distDir, 'index.html');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveFile(filePath) {
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        return indexFile;
      }
    }

    return filePath;
  }

  if (!path.extname(filePath)) {
    const indexFile = path.join(filePath, 'index.html');
    if (fs.existsSync(indexFile)) {
      return indexFile;
    }
  }

  return null;
}

const serverless = require('serverless-http');
const expressApp = require('../server');
const serverlessHandler = serverless(expressApp);

module.exports = async function handler(req, res) {
  const requestUrl = req.url || '/';
  const parsed = new URL(requestUrl, `https://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsed.pathname);

  // Always delegate to the Express app first. In Vercel serverless functions
  // the incoming `req.url` may have the `/api` prefix removed, so checking for
  // `/api/` can miss API requests. Call the serverless handler and return its
  // response when possible.
  try {
    // Quick debug endpoint to verify function invocation in production.
    if (req.url && req.url.startsWith('/api/__debug')) {
      // eslint-disable-next-line no-console
      console.log('DEBUG /api/__debug invoked', { method: req.method, url: req.url, headers: req.headers });
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, method: req.method, url: req.url, headers: req.headers }));
      return;
    }
    await serverlessHandler(req, res);
    return;
  } catch (err) {
    // If the serverless handler throws, return a JSON error so callers
    // receive a clear response instead of the SPA HTML. Log the error
    // for diagnosis in deployment logs.
    // eslint-disable-next-line no-console
    console.error('serverless handler error:', err && err.stack ? err.stack : err);

    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Server error in API handler', details: String(err?.message || err) }));
    return;
  }

  const relativePath = pathname === '/' ? '' : pathname.replace(/^\/+/, '');
  const candidatePath = relativePath ? path.join(distDir, relativePath) : distDir;
  const filePath = resolveFile(candidatePath) || indexPath;
  const contentType = contentTypes[path.extname(filePath)] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('content-type', contentType);
  res.end(fs.readFileSync(filePath));
};
