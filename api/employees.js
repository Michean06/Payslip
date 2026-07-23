const express = require('express');
const serverless = require('serverless-http');
const employeesRouter = require('../server/routes/employees');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api/employees', employeesRouter);

const handler = serverless(app);

module.exports = async function employeesHandler(req, res) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  return handler(req, res);
};
