const API_BASE_URL = (window.API_BASE_URL || window.location.origin).replace(/\/$/, '');
const API_AUTH_TOKEN = window.API_AUTH_TOKEN || '';

function buildAuthHeaders(extraHeaders = {}) {
  const headers = { ...extraHeaders };
  if (API_AUTH_TOKEN) headers.Authorization = `Bearer ${API_AUTH_TOKEN}`;
  return headers;
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const headers = buildAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: form, headers });
  return res.json();
}

async function fetchEmployees() {
  const res = await fetch(`${API_BASE_URL}/api/employees`);
  return res.json();
}

async function generatePdf(id) {
  const res = await fetch(`${API_BASE_URL}/api/pdf/generate/${id}`, { method: 'POST' });
  return res.json();
}

async function emailPayslip(id, email) {
  const res = await fetch(`${API_BASE_URL}/api/email/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

async function clearAllData() {
  const confirmDelete = window.confirm('This will permanently delete all rows from the payroll records table. Continue?');
  if (!confirmDelete) return;

  const headers = buildAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/payroll-records/clear-all?table=payroll_records`, { method: 'DELETE', headers });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.error) {
    throw new Error(payload.error || 'Failed to clear data');
  }
  return payload;
}

const SENT_EMAILS_KEY = 'payslip-sent-emails';
const GENERATED_PDFS_KEY = 'payslip-generated';
const EDIT_EMAILS_KEY = 'payslip-edit-email';
const DELETED_SENT_EMAILS_KEY = 'payslip-deleted-sent-emails';

function getStoredIds(key) {
  try {
    const stored = localStorage.getItem(key);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function saveStoredIds(key, ids) {
  localStorage.setItem(key, JSON.stringify([...ids]));
}

function getSentEmails() {
  return getStoredIds(SENT_EMAILS_KEY);
}

function saveSentEmails(ids) {
  saveStoredIds(SENT_EMAILS_KEY, ids);
}

function markEmailSent(id) {
  const ids = getSentEmails();
  ids.add(String(id));
  saveSentEmails(ids);
}

function getGeneratedPayslips() {
  return getStoredIds(GENERATED_PDFS_KEY);
}

function saveGeneratedPayslips(ids) {
  saveStoredIds(GENERATED_PDFS_KEY, ids);
}

function markPayslipGenerated(id) {
  const ids = getGeneratedPayslips();
  ids.add(String(id));
  saveGeneratedPayslips(ids);
}

function clearPayslipGenerated(id) {
  const ids = getGeneratedPayslips();
  ids.delete(String(id));
  saveGeneratedPayslips(ids);
}

function getEditableEmails() {
  return getStoredIds(EDIT_EMAILS_KEY);
}

function saveEditableEmails(ids) {
  saveStoredIds(EDIT_EMAILS_KEY, ids);
}

function markEditableEmail(id) {
  const ids = getEditableEmails();
  ids.add(String(id));
  saveEditableEmails(ids);
}

function clearEditableEmail(id) {
  const ids = getEditableEmails();
  ids.delete(String(id));
  saveEditableEmails(ids);
}

function getDeletedSentEmails() {
  return getStoredIds(DELETED_SENT_EMAILS_KEY);
}

function saveDeletedSentEmails(ids) {
  saveStoredIds(DELETED_SENT_EMAILS_KEY, ids);
}

function markDeletedSentEmail(id) {
  const ids = getDeletedSentEmails();
  ids.add(String(id));
  saveDeletedSentEmails(ids);
}

function clearSentEmail(id) {
  const ids = getSentEmails();
  ids.delete(String(id));
  saveSentEmails(ids);
  markDeletedSentEmail(id);
}

function clearDeletedSentEmail(id) {
  const ids = getDeletedSentEmails();
  ids.delete(String(id));
  saveDeletedSentEmails(ids);
}

let editingEmployeeId = null;

function openEditModal(employee) {
  editingEmployeeId = employee.id;
  document.getElementById('editEmployeeId').value = employee.id || '';
  document.getElementById('editEmailInput').value = employee.email || '';
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('editModal').classList.add('flex');
  document.getElementById('editEmailInput').focus();
}

function closeEditModal() {
  editingEmployeeId = null;
  document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editModal').classList.remove('flex');
  document.getElementById('editEmailForm').reset();
}

function openPayslip(id) {
  return fetch(`${API_BASE_URL}/api/pdf/generate/${id}`, { method: 'POST' })
    .then(res => res.json())
    .then(res => {
      if (res.error) throw new Error(res.error);
      if (res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (res.base64) {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i += 1) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    });
}

function renderEmployees(list) {
  const tbody = document.querySelector('#employeesTable tbody');
  tbody.innerHTML = '';
  const sentEmails = getSentEmails();
  const generatedPayslips = getGeneratedPayslips();
  const editableEmails = getEditableEmails();
  const deletedSentEmails = getDeletedSentEmails();

  list.forEach(e => {
    const id = String(e.id || '');
    const isDeletedSent = deletedSentEmails.has(id);
    const alreadySent = sentEmails.has(id) && !isDeletedSent;
    const payslipGenerated = generatedPayslips.has(id);
    const isEditable = editableEmails.has(id);
    const showEditDeleteButtons = payslipGenerated && !isDeletedSent;
    const showEmailButton = payslipGenerated && !isDeletedSent;
    const emailDisabled = alreadySent || !payslipGenerated;
    const emailText = alreadySent ? 'Email has been sent' : isEditable ? 'Send Again' : 'Email';
    const emailClasses = alreadySent
      ? 'email compact-action-btn bg-gray-500 text-white text-xs font-medium rounded cursor-not-allowed'
      : 'email compact-action-btn bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors';
    const generateButtonMarkup = payslipGenerated
      ? `<button data-id="${e.id}" class="view compact-action-btn bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors">View</button>`
      : `<button data-id="${e.id}" class="gen compact-action-btn bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">Generate</button>`;
    const tr = document.createElement('tr');
    tr.className = 'border-b border-gray-200 hover:bg-gray-50';
    tr.innerHTML = `
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">${e.id || ''}</td>
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">${e.employee_id || ''}</td>
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">${e.name || ''}</td>
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">${e.position || ''}</td>
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">${e.email || ''}</td>
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700">${e.basic_salary || ''}</td>
      <td class="border border-gray-300 px-4 py-3 text-sm text-gray-700 space-x-1 actions-row">
        ${generateButtonMarkup}
        ${showEditDeleteButtons ? `<button data-id="${e.id}" class="edit compact-action-btn bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors">Edit</button>` : ''}
        ${showEditDeleteButtons ? `<button data-id="${e.id}" class="delete compact-action-btn bg-red-600 text-white font-medium rounded hover:bg-red-700 transition-colors">Delete</button>` : ''}
        ${showEmailButton ? `<button data-id="${e.id}" class="${emailClasses} compact-action-btn" ${emailDisabled ? 'disabled' : ''}>${emailText}</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}


document.getElementById('uploadForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fileInput = document.getElementById('fileInput');
  if (!fileInput.files.length) return;
  
  const resultDiv = document.getElementById('uploadResult');
  resultDiv.classList.remove('hidden');
  resultDiv.textContent = 'Uploading...';
  
  const res = await uploadFile(fileInput.files[0]);
  if (res.error) {
    resultDiv.className = 'mt-4 p-3 bg-red-100 text-red-700 rounded text-sm';
    resultDiv.textContent = 'Error: ' + res.error;
  } else {
    resultDiv.className = 'mt-4 p-3 bg-green-100 text-green-700 rounded text-sm';
    resultDiv.textContent = `Uploaded successfully! ${res.inserted?.length || 0} employee(s) added.`;
  }
  loadEmployees();
});

async function loadEmployees() {
  const list = await fetchEmployees();
  renderEmployees(list || []);
}

document.getElementById('refreshBtn').addEventListener('click', loadEmployees);
document.getElementById('clearDataBtn').addEventListener('click', async () => {
  try {
    const result = await clearAllData();
    if (result.success) {
      localStorage.removeItem(SENT_EMAILS_KEY);
      localStorage.removeItem(GENERATED_PDFS_KEY);
      localStorage.removeItem(EDIT_EMAILS_KEY);
      localStorage.removeItem(DELETED_SENT_EMAILS_KEY);
      await loadEmployees();
      alert('✓ All payroll data deleted successfully');
    }
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
});
document.getElementById('generateAllBtn').addEventListener('click', async () => {
  const rows = document.querySelectorAll('#employeesTable tbody tr');
  for (const row of rows) {
    const id = row.querySelector('button.gen')?.getAttribute('data-id');
    if (!id) continue;
    const btn = row.querySelector('button.gen');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    const res = await generatePdf(id);
    if (!res.error) {
      markPayslipGenerated(id);
      clearDeletedSentEmail(id);
      btn.className = 'view px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors';
      btn.textContent = 'View Payslip';
    } else {
      btn.className = 'gen px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors';
      btn.textContent = 'Generate Payslip';
    }
    btn.disabled = false;
  }
  loadEmployees();
  alert('✓ Bulk payslip generation completed');
});
document.getElementById('sendAllBtn').addEventListener('click', async () => {
  const rows = document.querySelectorAll('#employeesTable tbody tr');
  for (const row of rows) {
    const id = row.querySelector('.email')?.getAttribute('data-id');
    if (!id) continue;
    const btn = row.querySelector('.email');
    if (!btn || btn.disabled) continue;
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const res = await emailPayslip(id);
    if (res.success) {
      markEmailSent(id);
      clearEditableEmail(id);
      btn.textContent = 'Email has been sent';
      btn.disabled = true;
      btn.className = 'email px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded cursor-not-allowed';
    } else {
      btn.disabled = false;
      btn.textContent = 'Send Again';
    }
  }
  loadEmployees();
  alert('✓ Bulk email sending completed');
});
document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeEditModal);
document.getElementById('editModal').addEventListener('click', (ev) => {
  if (ev.target.id === 'editModal') closeEditModal();
});
document.getElementById('editEmailForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (!editingEmployeeId) return;
  const email = document.getElementById('editEmailInput').value.trim();
  if (!email) return;

  const btn = document.querySelector(`.email[data-id="${editingEmployeeId}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending...';
  }

  const res = await emailPayslip(editingEmployeeId, email);
  if (res.success) {
    markEmailSent(editingEmployeeId);
    clearEditableEmail(editingEmployeeId);
    if (btn) {
      btn.textContent = 'Email has been sent';
      btn.disabled = true;
      btn.className = 'email px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded cursor-not-allowed';
    }
    closeEditModal();
    alert('✓ Email sent successfully');
  } else {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send Again';
    }
    closeEditModal();
    alert('❌ Error: ' + (res.error || 'Unknown error'));
  }
});

document.querySelector('#employeesTable').addEventListener('click', async (ev) => {
  const btn = ev.target;
  const id = btn.getAttribute('data-id');
  if (!id) return;
  if (btn.classList.contains('gen')) {
    btn.disabled = true;
    btn.textContent = 'Generating...';
    const res = await generatePdf(id);
    if (res.error) {
      alert('❌ Error: ' + res.error);
      btn.className = 'gen px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors';
      btn.textContent = 'Generate Payslip';
    } else {
      markPayslipGenerated(id);
      clearDeletedSentEmail(id);
      btn.className = 'view px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors';
      btn.textContent = 'View Payslip';
      alert('✓ Payslip generated');
    }
    btn.disabled = false;
    loadEmployees();
  } else if (btn.classList.contains('view')) {
    btn.disabled = true;
    btn.textContent = 'Opening...';
    try {
      await openPayslip(id);
    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'View Payslip';
    }
  } else if (btn.classList.contains('edit')) {
    const employee = { id, email: btn.closest('tr').children[2].textContent.trim() };
    openEditModal(employee);
  } else if (btn.classList.contains('delete')) {
    clearSentEmail(id);
    clearPayslipGenerated(id);
    loadEmployees();
    alert('✓ Email status removed');
  } else if (btn.classList.contains('email')) {
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const res = await emailPayslip(id);
    if (res.success) {
      markEmailSent(id);
      clearEditableEmail(id);
      btn.textContent = 'Email has been sent';
      btn.disabled = true;
      btn.className = 'email px-3 py-1 bg-gray-500 text-white text-xs font-medium rounded cursor-not-allowed';
      alert('✓ Email sent successfully');
    } else {
      btn.disabled = false;
      btn.textContent = 'Send Again';
      alert('❌ Error: ' + (res.error || 'Unknown error'));
    }
  }
});

// initial load
loadEmployees();
