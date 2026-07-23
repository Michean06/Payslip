const express = require('express');
const serverless = require('serverless-http');
const employeesRouter = require('../server/routes/employees');
const uploadRouter = require('../server/routes/upload');
const emailRouter = require('../server/routes/email');
const payrollRecordsRouter = require('../server/routes/payrollRecords');
const pdfRouter = require('../server/routes/pdf');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/api/employees', employeesRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/email', emailRouter);
app.use('/api/payroll-records', payrollRecordsRouter);
app.use('/api/pdf', pdfRouter);

const handler = serverless(app);

module.exports = async function catchAllApiHandler(req, res) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  return handler(req, res);
};
