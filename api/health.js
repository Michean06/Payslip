// Minimal serverless function to test that Vercel invokes our API functions
module.exports = (req, res) => {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.status(200).json({
    ok: true,
    now: new Date().toISOString(),
    url: req.url,
    method: req.method,
    headers: req.headers
  });
};
