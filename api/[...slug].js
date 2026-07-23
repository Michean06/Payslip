const employeesHandler = require('./employees');
const uploadHandler = require('./upload');

function getPathname(req) {
  const requestUrl = req.url || '/';
  const parsed = new URL(requestUrl, 'https://localhost');
  const pathname = decodeURIComponent(parsed.pathname);

  if (!pathname || pathname === '/') {
    return '/api';
  }

  if (pathname.startsWith('/api/')) {
    return pathname;
  }

  return `/api${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

module.exports = async function catchAllApiHandler(req, res) {
  const pathname = getPathname(req);

  if (pathname === '/api/employees') {
    return employeesHandler(req, res);
  }

  if (pathname === '/api/upload') {
    return uploadHandler(req, res);
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Not found' }));
};
