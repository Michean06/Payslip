require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRouter = require('./routes/upload');
const employeesRouter = require('./routes/employees');
const pdfRouter = require('./routes/pdf');
const emailRouter = require('./routes/email');
const payrollRecordsRouter = require('./routes/payrollRecords');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',').map((origin) => origin.trim()).filter(Boolean);

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
const buildDir = path.join(publicDir, 'dist');
const builtIndexPath = path.join(buildDir, 'index.html');

app.use(express.static(publicDir));
app.use(express.static(buildDir));

app.get(/^\/(?!api\/).*/, (req, res, next) => {
  if (req.path.includes('.')) {
    return next();
  }

  res.sendFile(builtIndexPath);
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Payslip system listening on port ${PORT}`);
  });
}

module.exports = app;
