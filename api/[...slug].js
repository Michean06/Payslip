const employeesHandler = require('./employees');
const healthHandler = require('./health');

function getPathname(req) {
  const requestUrl = req.url || '/';
  const parsed = new URL(requestUrl, 'https://localhost');
  return decodeURIComponent(parsed.pathname);
}

module.exports = async function catchAllApiHandler(req, res) {
  const pathname = getPathname(req);

  if (pathname === '/api/employees') {
    return employeesHandler(req, res);
  }

  if (pathname === '/api/health') {
    return healthHandler(req, res);
  }

  res.statusCode = 404;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'Not found' }));
};
