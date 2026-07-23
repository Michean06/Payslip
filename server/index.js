require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const uploadRouter = require('./routes/upload');
const employeesRouter = require('./routes/employees');
const pdfRouter = require('./routes/pdf');
const emailRouter = require('./routes/email');
const payrollRecordsRouter = require('./routes/payrollRecords');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  try {
    const { hostname } = new URL(normalizedOrigin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return false;
  }
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const normalizedOrigin = typeof origin === 'string' ? origin.replace(/\/$/, '') : '';
  const isAllowed = isAllowedOrigin(normalizedOrigin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/upload', uploadRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/email', emailRouter);
app.use('/api/payroll-records', payrollRecordsRouter);

// static frontend and Vite build output
const publicDir = path.join(__dirname, '..', 'public');
const buildDir = path.join(__dirname, '..', 'dist');
const builtIndexPath = path.join(buildDir, 'index.html');
const templatePath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Documents', 'sample-import-template.csv');

app.get('/sample-import-template.csv', (req, res) => {
  if (fs.existsSync(templatePath)) {
    res.setHeader('content-type', 'text/csv; charset=utf-8');
    res.sendFile(templatePath);
    return;
  }

  res.status(404).send('Template not found');
});

app.get(/^\/(?!api\/).*/, (req, res, next) => {
  if (req.path.includes('.')) {
    return next();
  }

  if (fs.existsSync(builtIndexPath)) {
    return res.sendFile(builtIndexPath);
  }

  return next();
});

app.use(express.static(buildDir));
app.use(express.static(publicDir));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Payslip system listening on port ${PORT}`);
  });
}

module.exports = app;
