function requireAdminAuthIfConfigured(req, res, next) {
  const expectedToken = process.env.ADMIN_AUTH_TOKEN || process.env.API_AUTH_TOKEN || process.env.UPLOAD_AUTH_TOKEN;

  if (!expectedToken) {
    return next();
  }

  const providedAuth = req.get('authorization') || req.get('x-api-key') || '';
  const providedToken = providedAuth.startsWith('Bearer ')
    ? providedAuth.slice(7).trim()
    : providedAuth.trim();

  if (providedToken && providedToken === expectedToken) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized. Configure ADMIN_AUTH_TOKEN and send a valid Bearer token.' });
}

module.exports = {
  requireAdminAuthIfConfigured
};
