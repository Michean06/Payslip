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

module.exports = function handler(req, res) {
  const requestUrl = req.url || '/';
  const parsed = new URL(requestUrl, `https://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/')) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'API routes are not available in this deployment mode.' }));
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
