const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function formatMoney(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  function chunkToWords(chunk) {
    let text = '';
    const hundred = Math.floor(chunk / 100);
    const remainder = chunk % 100;
    if (hundred) text += `${ones[hundred]} Hundred`;
    if (remainder) {
      if (text) text += ' ';
      if (remainder < 10) text += ones[remainder];
      else if (remainder < 20) text += teens[remainder - 10];
      else {
        const ten = Math.floor(remainder / 10);
        const one = remainder % 10;
        text += tens[ten];
        if (one) text += ` ${ones[one]}`;
      }
    }
    return text;
  }

  if (typeof num !== 'number' || Number.isNaN(num)) return '';
  const isNegative = num < 0;
  num = Math.abs(num);
  const [intPart, decPart] = num.toFixed(2).split('.');
  const chunks = [];
  let i = intPart.length;
  while (i > 0) {
    const start = Math.max(0, i - 3);
    chunks.unshift(Number(intPart.slice(start, i)));
    i -= 3;
  }

  if (chunks.every((chunk) => chunk === 0)) return 'Zero Pesos Only';

  const words = chunks.map((chunk, index) => {
    if (!chunk) return '';
    const scale = scales[chunks.length - index - 1];
    return `${chunkToWords(chunk)}${scale ? ` ${scale}` : ''}`.trim();
  }).filter(Boolean).join(' ');

  const phrase = `${isNegative ? 'Minus ' : ''}${words} Pesos`;
  if (decPart !== '00') return `${phrase} and ${decPart}/100 Only`;
  return `${phrase} Only`;
}

function getLayoutConfig(rows, availableWidth, measureText = () => 0) {
  const maxCols = Math.max(...rows.map((row) => row.length), 0) || 1;
  const measured = Array.from({ length: maxCols }, () => 0);

  rows.forEach((row) => {
    row.forEach((cell, colIndex) => {
      const text = String(cell || '');
      const measuredWidth = measureText(text, colIndex, row) || 0;
      if (measuredWidth > measured[colIndex]) measured[colIndex] = measuredWidth;
    });
  });

  const minCellWidth = 40;
  const widths = measured.map((value) => Math.max(minCellWidth, value + 16));
  let totalWidth = widths.reduce((sum, width) => sum + width, 0);

  if (totalWidth < availableWidth) {
    const remaining = availableWidth - totalWidth;
    const totalWeight = measured.reduce((sum, value) => sum + Math.max(1, value), 0) || maxCols;
    widths.forEach((width, index) => {
      const weight = Math.max(1, measured[index] || 1);
      const extra = Math.floor(remaining * (weight / totalWeight));
      widths[index] = width + extra;
    });
    totalWidth = widths.reduce((sum, width) => sum + width, 0);
    if (totalWidth < availableWidth) widths[widths.length - 1] += (availableWidth - totalWidth);
  } else if (totalWidth > availableWidth) {
    const scale = availableWidth / totalWidth;
    for (let i = 0; i < widths.length; i += 1) {
      widths[i] = Math.max(minCellWidth, Math.round(widths[i] * scale));
    }
    let scaledTotal = widths.reduce((sum, width) => sum + width, 0);
    let delta = availableWidth - scaledTotal;
    let index = widths.length - 1;
    while (delta !== 0 && index >= 0) {
      const oldWidth = widths[index];
      const newWidth = Math.max(minCellWidth, oldWidth + delta);
      widths[index] = newWidth;
      delta -= newWidth - oldWidth;
      index -= 1;
    }
    scaledTotal = widths.reduce((sum, width) => sum + width, 0);
    if (scaledTotal !== availableWidth) {
      widths[widths.length - 1] = Math.max(minCellWidth, widths[widths.length - 1] + (availableWidth - scaledTotal));
    }
  }

  return {
    availableWidth,
    colWidths: widths,
    borderPadding: 2,
    bodyFontSize: 9,
    headerFontSize: 9.5,
    lineGap: 2
  };
}

async function generatePayslipPdf(employee) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const {
    name,
    employee_name,
    employee_id = '',
    position = '',
    department = '',
    pay_date = '',
    pay_period,
    payroll_period,
    attendance_period = '',
    basic_salary,
    semi_monthly_basic_pay,
    monthly_basic_pay,
    allowances,
    taxable_allowances,
    overtime_pay = 0,
    holiday_pay = 0,
    withholding_tax = 0,
    sss_contribution,
    sss_employee_share,
    philhealth_contribution,
    philhealth_employee_share,
    pagibig_contribution,
    pagibig_employee_share,
    cash_advance,
    salary_advance,
    gross_pay,
    gross_taxable_earnings,
    net_pay,
    final_take_home_pay,
    medical_cash_allowance = 0,
    rice_subsidy = 0,
    laundry_allowance = 0,
    tax_refund = 0,
    cash_bond_insurance = 0,
    thirteenth_month_advance = 0,
    sss_loan = 0,
    pagibig_loan = 0,
    tardiness_undertime = 0,
    leave_without_pay = 0,
    salary_adjustment,
    taxable_salary_adjustment,
    salary_adjustment_deduction = 0,
    variable_performance_incentives = 0,
    net_taxable_compensation = null,
    net_pay_before_benefits_loans,
    net_pay_before_benefits,
    amount_in_words = ''
  } = employee || {};

  const finalName = name || employee_name || '';
  const finalPayPeriod = pay_period || payroll_period || '';
  const finalBasicSalary = basic_salary != null
    ? basic_salary
    : semi_monthly_basic_pay != null
      ? semi_monthly_basic_pay
      : monthly_basic_pay != null
        ? monthly_basic_pay
        : 0;
  const finalAllowances = allowances != null ? allowances : (taxable_allowances != null ? taxable_allowances : 0);
  const finalGross = gross_pay != null
    ? Number(gross_pay)
    : gross_taxable_earnings != null
      ? Number(gross_taxable_earnings)
      : finalBasicSalary + finalAllowances + overtime_pay + holiday_pay;
  const finalSalaryAdjustment = salary_adjustment != null ? salary_adjustment : (taxable_salary_adjustment != null ? taxable_salary_adjustment : 0);
  const finalCashAdvance = cash_advance != null ? cash_advance : (salary_advance != null ? salary_advance : 0);
  const finalSssContribution = sss_contribution != null ? sss_contribution : (sss_employee_share != null ? sss_employee_share : 0);
  const finalPhilhealthContribution = philhealth_contribution != null ? philhealth_contribution : (philhealth_employee_share != null ? philhealth_employee_share : 0);
  const finalPagibigContribution = pagibig_contribution != null ? pagibig_contribution : (pagibig_employee_share != null ? pagibig_employee_share : 0);
  const finalNet = net_pay != null
    ? Number(net_pay)
    : (final_take_home_pay != null ? Number(final_take_home_pay) : finalGross - (withholding_tax + finalSssContribution + finalPhilhealthContribution + finalPagibigContribution + finalCashAdvance));
  const finalNetPayBeforeBenefitsLoans = net_pay_before_benefits_loans != null
    ? net_pay_before_benefits_loans
    : (net_pay_before_benefits != null ? net_pay_before_benefits : null);
  const finalWithholdingTax = withholding_tax != null ? withholding_tax : 0;
  const finalNetTaxableCompensation = net_taxable_compensation;
  const finalAmountInWords = amount_in_words || '';

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const marginX = 28;
  const contentWidth = pageWidth - (marginX * 2);
  const paneGap = 20;
  const paneWidth = (contentWidth - paneGap) / 2;
  const leftX = marginX;
  const rightX = leftX + paneWidth + paneGap;
  const black = rgb(0, 0, 0);
  const maroon = rgb(0.502, 0, 0.125);
  const rule = rgb(0.72, 0.72, 0.72);
  const paleMaroon = rgb(0.96, 0.91, 0.92);
  const bodySize = 7.3;
  const labelSize = 7;
  const sectionSize = 8;
  const rowHeight = 14;

  const rightAligned = (text, right, y, size = bodySize, font = helveticaBold, color = black) => {
    const value = String(text || '');
    page.drawText(value, { x: right - font.widthOfTextAtSize(value, size), y, size, font, color });
  };
  const line = (y, x1 = marginX, x2 = pageWidth - marginX, thickness = 0.45, color = rule) => {
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
  };
  const drawSection = (title, x, y, width) => {
    page.drawRectangle({ x, y: y - 4, width, height: 13, color: paleMaroon });
    page.drawText(title, { x: x + 5, y, size: sectionSize, font: helveticaBold, color: maroon });
    line(y - 4, x, x + width, 0.55, maroon);
  };
  const drawItem = (label, value, x, y, width, { emphasis = false } = {}) => {
    const labelFont = emphasis ? helveticaBold : helvetica;
    const labelColor = emphasis ? maroon : black;
    page.drawText(label, { x: x + 4, y, size: bodySize, font: labelFont, color: labelColor, maxWidth: width - 78 });
    rightAligned(value, x + width - 4, y, bodySize, helveticaBold);
    line(y - 3, x, x + width, 0.25);
  };

  const title = 'EAST EQUATOR EXPRESS PHILIPPINES INC.';
  page.drawText(title, { x: marginX, y: pageHeight - 39, size: 11.2, font: helveticaBold, color: maroon });
  page.drawText('PAYSLIP', { x: pageWidth - marginX - helveticaBold.widthOfTextAtSize('PAYSLIP', 12), y: pageHeight - 39, size: 12, font: helveticaBold, color: maroon });
  page.drawText('2nd Floor CDN Bldg. Kaohsiung St. North Reclamation Area, Mabolo, Cebu City', { x: marginX, y: pageHeight - 53, size: 6.8, font: helvetica, color: black });
  page.drawText('TIN 010-766-826-000', { x: marginX, y: pageHeight - 64, size: 6.8, font: helveticaBold, color: maroon });
  rightAligned('Tel No.: 032 - 272 6351', pageWidth - marginX, pageHeight - 64, 6.8, helvetica);
  line(pageHeight - 72, marginX, pageWidth - marginX, 0.8, maroon);

  const identityRows = [
    [['Employee Name', finalName], ['Attendance Period', attendance_period || finalPayPeriod], ['SSS Number', employee.sss_number || employee_id]],
    [['Department', department], ['Processing Period', finalPayPeriod], ['PhilHealth Number', employee.phic_number || employee.philhealth_number || employee.philhealth || '']],
    [['Position', position], ['Payout Date', pay_date], ['Pag-IBIG Number', employee.hdmf_number || employee.pagibig_number || employee.pagibig || '']]
  ];
  const identityWidth = contentWidth / 3;
  let y = pageHeight - 88;
  identityRows.forEach((row) => {
    row.forEach(([label, value], index) => {
      const x = marginX + (index * identityWidth);
      page.drawText(label, { x, y, size: labelSize, font: helvetica, color: black });
      page.drawText(String(value || ''), { x: x + 65, y, size: labelSize, font: helveticaBold, color: black, maxWidth: identityWidth - 67 });
    });
    y -= 13;
  });
  line(y + 4, marginX, pageWidth - marginX, 0.45);

  y -= 17;
  drawSection('TAXABLE EARNINGS', leftX, y, paneWidth);
  drawSection('LESS: WITHHOLDING TAX', rightX, y, paneWidth);
  rightAligned(formatMoney(withholding_tax), rightX + paneWidth - 5, y, bodySize, helveticaBold);
  y -= 18;

  const leftItems = [
    ['Basic Pay', formatMoney(finalBasicSalary)], ['Taxable Allowances', formatMoney(finalAllowances)],
    ['Overtime', formatMoney(overtime_pay)], ['Holiday Pay', formatMoney(holiday_pay)],
    ['Variable Performance Incentives', formatMoney(variable_performance_incentives)],
    ['Taxable Salary Adjustment (+)', formatMoney(finalSalaryAdjustment)], ['GROSS TAXABLE EARNINGS', formatMoney(finalGross), true]
  ];
  const rightItems = [
    ['NET PAY (Before Benefits & Loans)', formatMoney(finalNetPayBeforeBenefitsLoans != null ? finalNetPayBeforeBenefitsLoans : finalGross), true], ['ADD: NON-TAXABLE BENEFITS (DE MINIMIS)', '', true],
    ['Medical Cash Allowance', formatMoney(medical_cash_allowance)], ['Rice Subsidy', formatMoney(rice_subsidy)],
    ['Laundry Allowance', formatMoney(laundry_allowance)], ['ADD: OTHER EARNINGS / TAX REFUND', formatMoney(tax_refund), true]
  ];
  const firstBodyY = y;
  leftItems.forEach(([label, value, emphasis], index) => drawItem(label, value, leftX, firstBodyY - (index * rowHeight), paneWidth, { emphasis }));
  rightItems.forEach(([label, value, emphasis], index) => drawItem(label, value, rightX, firstBodyY - (index * rowHeight), paneWidth, { emphasis }));

  y = firstBodyY - (leftItems.length * rowHeight) - 13;
  drawSection('LESS: EARNING DEDUCTIONS', leftX, y, paneWidth);
  drawSection('LESS: OTHER AUTHORIZED DEDUCTIONS', rightX, y, paneWidth);
  y -= 18;
  const leftDeductions = [['Tardiness / Undertime (No Pay)', formatMoney(tardiness_undertime)], ['Leave Without Pay (LWOP)', formatMoney(leave_without_pay)], ['Salary Adjustment (-)', formatMoney(salary_adjustment_deduction)]];
  const rightDeductions = [['Cash Bond/Insurance', formatMoney(cash_bond_insurance)], ['Salary Advance', formatMoney(finalCashAdvance)], ['13th Month Advance', formatMoney(thirteenth_month_advance)], ['SSS Loan', formatMoney(sss_loan)], ['Pag-IBIG Loan', formatMoney(pagibig_loan)]];
  leftDeductions.forEach(([label, value], index) => drawItem(label, value, leftX, y - (index * rowHeight), paneWidth));
  rightDeductions.forEach(([label, value], index) => drawItem(label, value, rightX, y - (index * rowHeight), paneWidth));

  y -= (rightDeductions.length * rowHeight) + 14;
  drawSection('LESS: STATUTORY DEDUCTIONS', leftX, y, paneWidth);
  y -= 18;
  [['SSS (Employee Share)', formatMoney(finalSssContribution)], ['PhilHealth (Employee Share)', formatMoney(finalPhilhealthContribution)], ['Pag-IBIG (Employee Share)', formatMoney(finalPagibigContribution)]].forEach(([label, value], index) => drawItem(label, value, leftX, y - (index * rowHeight), paneWidth));

  const totalsY = y - (3 * rowHeight) - 18;
  page.drawRectangle({ x: marginX, y: totalsY - 5, width: contentWidth, height: 19, color: paleMaroon });
  line(totalsY - 5, marginX, pageWidth - marginX, 0.8, maroon);
  page.drawText('NET TAXABLE COMPENSATION', { x: leftX + 5, y: totalsY, size: sectionSize, font: helveticaBold, color: maroon });
  rightAligned(formatMoney(finalNetTaxableCompensation != null ? finalNetTaxableCompensation : finalNet), leftX + paneWidth - 5, totalsY, bodySize, helveticaBold);
  page.drawText('FINAL TAKE-HOME PAY', { x: rightX + 5, y: totalsY, size: sectionSize, font: helveticaBold, color: maroon });
  rightAligned(formatMoney(finalNet), rightX + paneWidth - 5, totalsY, bodySize, helveticaBold);

  const noteY = totalsY - 25;
  const note = '***SYSTEM GENERATED SIGNATURE IS NOT REQUIRED';
  page.drawText(note, { x: (pageWidth - helvetica.widthOfTextAtSize(note, 6.2)) / 2, y: noteY, size: 6.2, font: helvetica, color: maroon });
  const certificationY = noteY - 24;
  page.drawText('Certified True and Correct:', { x: leftX, y: certificationY, size: 6.8, font: helvetica, color: maroon });
  page.drawText('Mary Grace Blanco', { x: leftX, y: certificationY - 11, size: 6.5, font: helveticaBold, color: black });
  page.drawText('Human Resource - Compensation Officer', { x: leftX, y: certificationY - 21, size: 6.2, font: helvetica, color: black });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generatePayslipPdf, getLayoutConfig };

