const { generatePayslipPdf } = require('./server/pdfUtil');
const fs = require('fs');

(async () => {
  const sample = {
    name: 'Juan Dela Cruz',
    employee_id: 'SSS123456',
    position: 'Driver',
    department: 'Operations',
    pay_date: 'July 3, 2026',
    pay_period: 'June 26 - July 3, 2026',
    basic_salary: 35000,
    allowances: 5000,
    overtime_pay: 1500,
    holiday_pay: 1250,
    withholding_tax: 4235.83,
    sss_contribution: 1125,
    philhealth_contribution: 450,
    pagibig_contribution: 200,
    cash_advance: 0,
    employee_loan: 0
  };

  try {
    const buf = await generatePayslipPdf(sample);
    fs.writeFileSync('out_payslip.pdf', buf);
    console.log('Wrote out_payslip.pdf');
  } catch (err) {
    console.error('Error generating PDF', err);
  }
})();