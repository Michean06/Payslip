CREATE TABLE IF NOT EXISTS payroll_records (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  employee_id TEXT,
  email TEXT,
  position TEXT,
  department TEXT,
  pay_date TEXT,
  pay_period TEXT,
  pay_frequency TEXT,
  tax_status TEXT,
  basic_salary NUMERIC,
  allowances NUMERIC,
  transportation_allowance NUMERIC,
  meal_allowance NUMERIC,
  overtime_pay NUMERIC,
  night_differential NUMERIC,
  holiday_pay NUMERIC,
  gross_pay NUMERIC,
  withholding_tax NUMERIC,
  sss_contribution NUMERIC,
  philhealth_contribution NUMERIC,
  pagibig_contribution NUMERIC,
  employee_loan NUMERIC,
  cash_advance NUMERIC,
  total_deductions NUMERIC,
  net_pay NUMERIC,
  amount_in_words TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fields used by the payslip import template. These statements also upgrade
-- an existing payroll_records table created from an earlier version.
ALTER TABLE public.payroll_records
  ADD COLUMN IF NOT EXISTS headcount TEXT,
  ADD COLUMN IF NOT EXISTS attendance_period TEXT,
  ADD COLUMN IF NOT EXISTS people_group TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS sss_number TEXT,
  ADD COLUMN IF NOT EXISTS philhealth_number TEXT,
  ADD COLUMN IF NOT EXISTS pagibig_number TEXT,
  ADD COLUMN IF NOT EXISTS wage_category TEXT,
  ADD COLUMN IF NOT EXISTS annual_working_days NUMERIC,
  ADD COLUMN IF NOT EXISTS monthly_basic_pay NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS days_worked NUMERIC,
  ADD COLUMN IF NOT EXISTS variable_performance_incentives NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_adjustment NUMERIC,
  ADD COLUMN IF NOT EXISTS tardiness_undertime NUMERIC,
  ADD COLUMN IF NOT EXISTS leave_without_pay NUMERIC,
  ADD COLUMN IF NOT EXISTS salary_adjustment_deduction NUMERIC,
  ADD COLUMN IF NOT EXISTS net_taxable_compensation NUMERIC,
  ADD COLUMN IF NOT EXISTS net_pay_before_benefits_loans NUMERIC,
  ADD COLUMN IF NOT EXISTS medical_cash_allowance NUMERIC,
  ADD COLUMN IF NOT EXISTS rice_subsidy NUMERIC,
  ADD COLUMN IF NOT EXISTS laundry_allowance NUMERIC,
  ADD COLUMN IF NOT EXISTS tax_refund NUMERIC,
  ADD COLUMN IF NOT EXISTS cash_bond_insurance NUMERIC,
  ADD COLUMN IF NOT EXISTS thirteenth_month_advance NUMERIC,
  ADD COLUMN IF NOT EXISTS sss_loan NUMERIC,
  ADD COLUMN IF NOT EXISTS pagibig_loan NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS paid_by TEXT;

-- Also create an employees table with the same schema so the app can use either table name.
CREATE TABLE IF NOT EXISTS employees (LIKE payroll_records INCLUDING ALL);

-- Lets the application create an import template from a table's real columns,
-- including when the table has no records yet. Run this in the Supabase SQL editor.
CREATE OR REPLACE FUNCTION public.get_table_columns(target_table TEXT)
RETURNS TABLE(column_name TEXT, ordinal_position INTEGER)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT columns.column_name::TEXT, columns.ordinal_position::INTEGER
  FROM information_schema.columns
  WHERE columns.table_schema = 'public'
    AND columns.table_name = target_table
  ORDER BY columns.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO anon, authenticated;
