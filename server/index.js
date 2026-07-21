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
app.use(cors());
app.use(express.json());

app.use('/api/upload', uploadRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/pdf', pdfRouter);
app.use('/api/email', emailRouter);
app.use('/api/payroll-records', payrollRecordsRouter);

// static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Payslip system listening on port ${PORT}`);
  });
}

module.exports = app;
