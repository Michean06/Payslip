function normalizeEmployee(record = {}) {
  const employee = { ...record };

  employee.name = record.name || record.employee_name || '';
  employee.email = record.email || record.email_address || '';
  employee.employee_id = record.employee_id || '';
  employee.position = record.position || '';
  employee.department = record.department || '';
  employee.pay_date = record.pay_date || '';
  employee.pay_period = record.pay_period || record.payroll_period || '';
  employee.pay_frequency = record.pay_frequency || '';
  employee.tax_status = record.tax_status || '';
  employee.attendance_period = record.attendance_period || '';
  employee.headcount = record.headcount || '';
  employee.people_group = record.people_group || '';
  employee.location = record.location || '';
  employee.sss_number = record.sss_number || '';
  employee.phic_number = record.phic_number || record.philhealth_number || '';
  employee.hdmf_number = record.hdmf_number || record.pagibig_number || '';
  employee.philhealth_number = record.philhealth_number || record.phic_number || '';
  employee.pagibig_number = record.pagibig_number || record.hdmf_number || '';
  employee.wage_category = record.wage_category || '';
  employee.monthly_basic_pay = record.monthly_basic_pay != null ? record.monthly_basic_pay : 0;
  employee.daily_rate = record.daily_rate != null ? record.daily_rate : 0;
  employee.days_worked = record.days_worked != null ? record.days_worked : 0;
  employee.variable_performance_incentives = record.variable_performance_incentives != null ? record.variable_performance_incentives : 0;
  employee.salary_adjustment = record.salary_adjustment != null ? record.salary_adjustment : (record.taxable_salary_adjustment != null ? record.taxable_salary_adjustment : 0);

  employee.basic_salary = record.basic_salary != null
    ? record.basic_salary
    : record.semi_monthly_basic_pay != null
      ? record.semi_monthly_basic_pay
      : record.monthly_basic_pay != null
        ? record.monthly_basic_pay
        : 0;

  employee.allowances = record.allowances != null
    ? record.allowances
    : record.taxable_allowances != null
      ? record.taxable_allowances
      : 0;

  employee.transportation_allowance = record.transportation_allowance != null ? record.transportation_allowance : 0;
  employee.meal_allowance = record.meal_allowance != null ? record.meal_allowance : 0;
  employee.overtime_pay = record.overtime_pay != null ? record.overtime_pay : 0;
  employee.night_differential = record.night_differential != null ? record.night_differential : 0;
  employee.holiday_pay = record.holiday_pay != null ? record.holiday_pay : 0;

  employee.gross_pay = record.gross_pay != null
    ? record.gross_pay
    : record.gross_taxable_earnings != null
      ? record.gross_taxable_earnings
      : null;

  employee.withholding_tax = record.withholding_tax != null ? record.withholding_tax : 0;
  employee.sss_contribution = record.sss_contribution != null
    ? record.sss_contribution
    : record.sss_employee_share != null
      ? record.sss_employee_share
      : 0;
  employee.philhealth_contribution = record.philhealth_contribution != null
    ? record.philhealth_contribution
    : record.philhealth_employee_share != null
      ? record.philhealth_employee_share
      : 0;
  employee.pagibig_contribution = record.pagibig_contribution != null
    ? record.pagibig_contribution
    : record.pagibig_employee_share != null
      ? record.pagibig_employee_share
      : 0;

  employee.employee_loan = record.employee_loan != null ? record.employee_loan : 0;
  employee.cash_advance = record.cash_advance != null
    ? record.cash_advance
    : record.salary_advance != null
      ? record.salary_advance
      : 0;
  employee.total_deductions = record.total_deductions != null ? record.total_deductions : 0;

  employee.net_pay = record.net_pay != null
    ? record.net_pay
    : record.final_take_home_pay != null
      ? record.final_take_home_pay
      : null;

  employee.amount_in_words = record.amount_in_words || '';
  employee.net_taxable_compensation = record.net_taxable_compensation != null ? record.net_taxable_compensation : null;
  employee.net_pay_before_benefits_loans = record.net_pay_before_benefits_loans != null
    ? record.net_pay_before_benefits_loans
    : record.net_pay_before_benefits != null
      ? record.net_pay_before_benefits
      : null;
  employee.medical_cash_allowance = record.medical_cash_allowance != null ? record.medical_cash_allowance : 0;
  employee.rice_subsidy = record.rice_subsidy != null ? record.rice_subsidy : 0;
  employee.laundry_allowance = record.laundry_allowance != null ? record.laundry_allowance : 0;
  employee.tax_refund = record.tax_refund != null ? record.tax_refund : 0;
  employee.cash_bond_insurance = record.cash_bond_insurance != null ? record.cash_bond_insurance : 0;
  employee.thirteenth_month_advance = record.thirteenth_month_advance != null ? record.thirteenth_month_advance : 0;
  employee.sss_loan = record.sss_loan != null ? record.sss_loan : 0;
  employee.pagibig_loan = record.pagibig_loan != null ? record.pagibig_loan : 0;
  employee.tardiness_undertime = record.tardiness_undertime != null ? record.tardiness_undertime : 0;
  employee.leave_without_pay = record.leave_without_pay != null ? record.leave_without_pay : 0;
  employee.salary_adjustment_deduction = record.salary_adjustment_deduction != null ? record.salary_adjustment_deduction : 0;
  employee.payment_date = record.payment_date || '';
  employee.paid_by = record.paid_by || '';
  employee.status = record.status || '';
  employee.bank_name = record.bank_name || '';
  employee.account_number = record.account_number || '';
  employee.created_at = record.created_at || null;
  employee.updated_at = record.updated_at || null;

  return employee;
}

const IMPORT_FIELD_MAP = {
  name: 'employee_name',
  email: 'email_address',
  pay_period: 'payroll_period',
  basic_salary: 'semi_monthly_basic_pay',
  allowances: 'taxable_allowances',
  gross_pay: 'gross_taxable_earnings',
  salary_adjustment: 'taxable_salary_adjustment',
  cash_advance: 'salary_advance',
  net_pay: 'final_take_home_pay',
  sss_contribution: 'sss_employee_share',
  philhealth_contribution: 'philhealth_employee_share',
  pagibig_contribution: 'pagibig_employee_share',
  net_pay_before_benefits_loans: 'net_pay_before_benefits',
  overtime: 'overtime_pay',
  employee_name: 'employee_name',
  email_address: 'email_address',
  payroll_period: 'payroll_period',
  semi_monthly_basic_pay: 'semi_monthly_basic_pay',
  semimonthly_basic_pay: 'semi_monthly_basic_pay',
  taxable_allowances: 'taxable_allowances',
  gross_taxable_earnings: 'gross_taxable_earnings',
  taxable_salary_adjustment: 'taxable_salary_adjustment',
  salary_advance: 'salary_advance',
  final_take_home_pay: 'final_take_home_pay',
  sss_employee_share: 'sss_employee_share',
  philhealth_employee_share: 'philhealth_employee_share',
  pagibig_employee_share: 'pagibig_employee_share',
  overtime_pay: 'overtime_pay'
};

const COLUMN_ALIASES = {
  employee_name: ['name', 'employee_name'],
  email_address: ['email', 'email_address'],
  payroll_period: ['pay_period', 'payroll_period', 'attendance_period'],
  semi_monthly_basic_pay: ['basic_salary', 'monthly_basic_pay', 'semi_monthly_basic_pay'],
  semimonthly_basic_pay: ['basic_salary', 'monthly_basic_pay', 'semi_monthly_basic_pay', 'semimonthly_basic_pay'],
  taxable_allowances: ['allowances', 'taxable_allowances'],
  gross_taxable_earnings: ['gross_pay', 'gross_taxable_earnings'],
  taxable_salary_adjustment: ['salary_adjustment', 'taxable_salary_adjustment'],
  salary_advance: ['cash_advance', 'salary_advance'],
  final_take_home_pay: ['net_pay', 'final_take_home_pay'],
  sss_employee_share: ['sss_contribution', 'sss_employee_share'],
  philhealth_employee_share: ['philhealth_contribution', 'philhealth_employee_share'],
  pagibig_employee_share: ['pagibig_contribution', 'pagibig_employee_share'],
  net_pay_before_benefits: ['net_pay', 'net_pay_before_benefits'],
  overtime_pay: ['overtime_pay', 'overtime'],
  name: ['employee_name', 'name'],
  email: ['email_address', 'email'],
  pay_period: ['payroll_period', 'pay_period', 'attendance_period'],
  basic_salary: ['semi_monthly_basic_pay', 'monthly_basic_pay', 'basic_salary'],
  allowances: ['taxable_allowances', 'allowances'],
  gross_pay: ['gross_taxable_earnings', 'gross_pay'],
  salary_adjustment: ['taxable_salary_adjustment', 'salary_adjustment'],
  cash_advance: ['salary_advance', 'cash_advance'],
  net_pay: ['final_take_home_pay', 'net_pay'],
  sss_contribution: ['sss_employee_share', 'sss_contribution'],
  philhealth_contribution: ['philhealth_employee_share', 'philhealth_contribution'],
  pagibig_contribution: ['pagibig_employee_share', 'pagibig_contribution']
};

function mapImportField(fieldName) {
  if (!fieldName) return fieldName;
  return IMPORT_FIELD_MAP[fieldName] || fieldName;
}

function resolveTableFieldName(fieldName, availableColumns) {
  if (!fieldName || !availableColumns) return fieldName;
  const normalizedField = String(fieldName || '').trim().toLowerCase();
  const canonical = mapImportField(normalizedField);
  const canonicalLower = String(canonical).trim().toLowerCase();

  const candidates = [normalizedField, canonicalLower];
  const aliases = COLUMN_ALIASES[normalizedField] || COLUMN_ALIASES[canonicalLower] || [];
  aliases.forEach((alias) => {
    const candidate = String(alias).trim().toLowerCase();
    if (!candidates.includes(candidate)) candidates.push(candidate);
  });

  for (const candidate of candidates) {
    if (availableColumns.has(candidate)) return availableColumns.get(candidate);
  }

  return availableColumns.get(canonicalLower) || fieldName;
}

module.exports = {
  normalizeEmployee,
  mapImportField,
  resolveTableFieldName
};
