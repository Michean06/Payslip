require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const uploadRouter = require('./routes/upload');
const employeesRouter = require('./routes/employees');
const pdfRouter = require('./routes/pdf');
const emailRouter = require('./routes/email');
const payrollRecordsRouter = require('./routes/payrollRecords');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  }
}));
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
    res.download(templatePath, 'sample-import-template.csv');
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
