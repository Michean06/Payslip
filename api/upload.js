const express = require('express');
const serverless = require('serverless-http');
const uploadRouter = require('../server/routes/upload');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api/upload', uploadRouter);

const handler = serverless(app);

module.exports = async function uploadHandler(req, res) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  return handler(req, res);
};
