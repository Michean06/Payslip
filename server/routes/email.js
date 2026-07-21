const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const supabase = require('../supabaseClient');
const fallbackStore = require('../fallbackStore');
const { generatePayslipPdf } = require('../pdfUtil');
const { normalizeEmployee } = require('../utils/employeeNormalizer');

const router = express.Router();
const tableName = process.env.SUPABASE_TABLE || 'payroll_records';

// POST /api/email/:id
router.post('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    let employee = null;

    if (req.body?.employee) {
      employee = normalizeEmployee(req.body.employee);
    }

    if (!employee && supabase) {
      try {
        const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
        if (!error && data) employee = normalizeEmployee(data);
      } catch (err) {
        console.warn('Supabase email lookup failed, using fallback store', err);
      }
    }

    if (!employee) {
      const fallbackEmployee = fallbackStore.getEmployeeById(id);
      if (fallbackEmployee) employee = normalizeEmployee(fallbackEmployee);
    }
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const requestedEmail = req.body?.email || employee.email;
    if (!requestedEmail) return res.status(400).json({ error: 'Employee has no email' });

    const pdfBuffer = await generatePayslipPdf(employee);
    const attendancePeriod = employee.attendance_period || employee.payroll_period || employee.pay_period || '';
    const employeeCode = employee.employee_id || employee.id || '';
    const subject = `${employeeCode} ${employee.name || ''} Payslip as of ${attendancePeriod}`.trim();
    const messageBody = `Dear ${employee.name || ''},\n\nGood day.\n\nPlease be informed that your payslip for ${attendancePeriod} is attached to this email. Kindly review the details carefully.\n\nThis payslip is confidential and intended solely for your personal record. Please ensure that it is kept secure and not shared with others.\n\nThank you.\n\nBest regards,\nHuman Resources Department\nEast Equator Express Philippines Inc.`;
    const defaultFrom = process.env.EMAIL_FROM_ADDRESS || 'marygraceblanco@eastequatorexpress.com';
    const formattedFrom = `"Human Resources Department" <${defaultFrom}>`;

    // Prefer Brevo (Sendinblue) via API when configured
    const brevoApiKey = process.env.BREVO_API_KEY;
    const brevoFrom = defaultFrom;
    if (brevoApiKey) {
      const payload = {
        sender: { name: 'Human Resources Department', email: brevoFrom },
        replyTo: { email: defaultFrom, name: 'Human Resources Department' },
        to: [{ email: requestedEmail, name: employee.name }],
        subject,
        htmlContent: messageBody.replace(/\n/g, '<br/>'),
        attachment: [
          { name: `payslip-${id}.pdf`, content: pdfBuffer.toString('base64') }
        ]
      };

      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await resp.json().catch(() => null);
      if (!resp.ok) {
        console.error('Brevo send failed', resp.status, result);
        return res.status(500).json({ error: 'Brevo send failed', details: result });
      }
      return res.json({ success: true, provider: 'brevo', result });
    }

    // Fallback to Gmail via Nodemailer if Brevo not configured
    const gmailUser = process.env.GMAIL_USER || process.env.GMAIL_FROM_EMAIL;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      const localEmailDir = path.join(__dirname, '..', '..', '.tmp-email-preview');
      fs.mkdirSync(localEmailDir, { recursive: true });
      const previewFile = path.join(localEmailDir, `payslip-${id}-${Date.now()}.eml`);
      const previewContent = `To: ${requestedEmail}\nSubject: ${subject}\n\n${messageBody}`;
      fs.writeFileSync(previewFile, previewContent, 'utf8');
      return res.json({ success: true, provider: 'local-preview', previewFile });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword
      }
    });

    const mailOptions = {
      from: formattedFrom,
      to: requestedEmail,
      subject,
      text: messageBody,
      replyTo: defaultFrom,
      attachments: [
        {
          filename: `payslip-${id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, provider: 'gmail', info });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
