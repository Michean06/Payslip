function isLocalRequest(req) {
  const origin = req.get('origin') || '';
  if (origin) {
    try {
      const { hostname } = new URL(origin);
      return ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'].includes(hostname);
    } catch {
      // Fall through to host-based detection below.
    }
  }

  const host = String(req.get('host') || req.hostname || '').toLowerCase();
  const hostname = host.split(':')[0].replace(/\[|\]/g, '');
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
}

function requireAdminAuthIfConfigured(req, res, next) {
  const expectedToken = process.env.ADMIN_AUTH_TOKEN || process.env.API_AUTH_TOKEN || process.env.UPLOAD_AUTH_TOKEN;

  if (!expectedToken) {
    return next();
  }

  const providedAuth = req.get('authorization') || req.get('x-api-key') || '';
  const providedToken = providedAuth.startsWith('Bearer ')
    ? providedAuth.slice(7).trim()
    : providedAuth.trim();

  if (!providedToken && isLocalRequest(req)) {
    return next();
  }

  if (providedToken && providedToken === expectedToken) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized. Configure ADMIN_AUTH_TOKEN and send a valid Bearer token.' });
}

module.exports = {
  requireAdminAuthIfConfigured
};
