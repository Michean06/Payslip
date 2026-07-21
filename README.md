# Payslip System

Simple Node + Express app to import Excel, generate payslip PDFs, store files in Supabase Storage, and email via Gmail.

Setup

1. Create a Supabase project and a table `payroll_records` with columns matching `schema.sql`.
   - Important fields include `employee_name`, `employee_id`, `position`, `department`, `pay_date`, `payroll_period`, `pay_frequency`, `tax_status`, `email_address`, `semi_monthly_basic_pay`, `taxable_allowances`, `transportation_allowance`, `meal_allowance`, `overtime_pay`, `night_differential`, `holiday_pay`, `gross_taxable_earnings`, `withholding_tax`, `sss_employee_share`, `philhealth_employee_share`, `pagibig_employee_share`, `salary_advance`, `total_deductions`, `final_take_home_pay`, and `amount_in_words`.
2. Create a private Storage bucket named `payslips`.
3. Copy `.env.example` to `.env` and fill `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`, `SUPABASE_TABLE`, `BREVO_API_KEY`, and `BREVO_FROM_EMAIL`.

Install and run

```bash
npm install
npm run dev
```

Frontend

Open http://localhost:3000 and import an Excel file. Use the sample import template at `/sample-import-template.xlsx`. Columns should include headers like `name`, `email`, `salary`, `deductions`, `net` (case-insensitive).

Notes

- This is a minimal example. For production, secure your Supabase keys and validate inputs.
- You may prefer to use server-side Supabase service role key for inserts or set Row Level Security appropriately.
