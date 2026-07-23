const expressApp = require('../server');
const serverless = require('serverless-http');

const handler = serverless(expressApp);

module.exports = async function uploadHandler(req, res) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  return handler(req, res);
};
