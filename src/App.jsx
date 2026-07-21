import { useEffect, useMemo, useRef, useState } from 'react';
import { getEmailButtonLabel, requestApiJson } from './utils/uiHelpers.mjs';

const SENT_EMAILS_KEY = 'payslip-sent-emails';
const GENERATED_PDFS_KEY = 'payslip-generated';
const EDIT_EMAILS_KEY = 'payslip-edit-email';
const DELETED_SENT_EMAILS_KEY = 'payslip-deleted-sent-emails';

function readStoredIds(key) {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const stored = window.localStorage.getItem(key);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

function saveStoredIds(key, ids) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify([...ids]));
}

function PayrollDashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [sentEmailIds, setSentEmailIds] = useState(() => readStoredIds(SENT_EMAILS_KEY));
  const [generatedPayslipIds, setGeneratedPayslipIds] = useState(() => readStoredIds(GENERATED_PDFS_KEY));
  const [editableEmailIds, setEditableEmailIds] = useState(() => readStoredIds(EDIT_EMAILS_KEY));
  const [deletedSentEmailIds, setDeletedSentEmailIds] = useState(() => readStoredIds(DELETED_SENT_EMAILS_KEY));
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [emailDraft, setEmailDraft] = useState('');
  const fileInputRef = useRef(null);

  const apiBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return (window.API_BASE_URL || window.location.origin || '').replace(/\/$/, '');
  }, []);

  useEffect(() => {
    saveStoredIds(SENT_EMAILS_KEY, sentEmailIds);
  }, [sentEmailIds]);

  useEffect(() => {
    saveStoredIds(GENERATED_PDFS_KEY, generatedPayslipIds);
  }, [generatedPayslipIds]);

  useEffect(() => {
    saveStoredIds(EDIT_EMAILS_KEY, editableEmailIds);
  }, [editableEmailIds]);

  useEffect(() => {
    saveStoredIds(DELETED_SENT_EMAILS_KEY, deletedSentEmailIds);
  }, [deletedSentEmailIds]);

  const loadEmployees = async () => {
    setLoading(true);
    setUploadMessage(null);

    try {
      const { payload } = await requestApiJson(apiBaseUrl, '/api/employees');

      if (payload?.error) {
        throw new Error(payload.error || 'Failed to load employees');
      }

      setEmployees(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [apiBaseUrl]);

  const handleUpload = async (event) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setUploadMessage({ type: 'error', text: 'Choose an Excel or CSV file first.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { payload } = await requestApiJson(apiBaseUrl, '/api/upload', {
        method: 'POST',
        body: formData
      });

      if (payload?.error) {
        throw new Error(payload.error || 'Upload failed');
      }

      setUploadMessage({
        type: 'success',
        text: `Uploaded successfully! ${payload.inserted?.length || 0} employee(s) added.`
      });
      fileInputRef.current.value = '';
      loadEmployees();
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message });
    }
  };

  const handleGenerateOrView = async (employee) => {
    try {
      const { payload } = await requestApiJson(apiBaseUrl, `/api/pdf/generate/${employee.id}`, {
        method: 'POST'
      });

      if (payload?.error) {
        throw new Error(payload.error || 'Failed to generate payslip');
      }

      if (payload.url) {
        window.open(payload.url, '_blank', 'noopener,noreferrer');
      } else if (payload.base64) {
        const byteCharacters = window.atob(payload.base64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let index = 0; index < byteCharacters.length; index += 1) {
          byteNumbers[index] = byteCharacters.charCodeAt(index);
        }
        const blob = new Blob([byteNumbers], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      }

      setGeneratedPayslipIds((current) => {
        const next = new Set(current);
        next.add(String(employee.id));
        return next;
      });
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message });
    }
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setEmailDraft(employee.email || '');
  };

  const closeEditModal = () => {
    setEditingEmployee(null);
    setEmailDraft('');
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();

    if (!editingEmployee) {
      return;
    }

    try {
      const { payload } = await requestApiJson(apiBaseUrl, `/api/email/${editingEmployee.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailDraft.trim(), employee: editingEmployee })
      });

      if (payload?.error) {
        throw new Error(payload.error || 'Failed to send email');
      }

      setSentEmailIds((current) => {
        const next = new Set(current);
        next.add(String(editingEmployee.id));
        return next;
      });
      setEditableEmailIds((current) => {
        const next = new Set(current);
        next.add(String(editingEmployee.id));
        return next;
      });
      setUploadMessage({ type: 'success', text: 'Email queued successfully.' });
      closeEditModal();
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message });
    }
  };

  const handleDelete = (employee) => {
    const id = String(employee.id);
    setDeletedSentEmailIds((current) => {
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const handleClearData = async () => {
    const confirmed = window.confirm('This will permanently delete all rows from the payroll records table. Continue?');
    if (!confirmed) {
      return;
    }

    try {
      const { payload } = await requestApiJson(apiBaseUrl, '/api/payroll-records/clear-all?table=payroll_records', {
        method: 'DELETE'
      });

      if (payload?.error) {
        throw new Error(payload.error || 'Failed to clear payroll data');
      }

      setUploadMessage({ type: 'success', text: 'Payroll data cleared.' });
      loadEmployees();
    } catch (error) {
      setUploadMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <>
      <section className="card">
        <h1>Payslip System</h1>

        <form onSubmit={handleUpload} className="upload-form">
          <label htmlFor="fileInput" className="field-label">Choose Excel File</label>
          <input
            id="fileInput"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            required
            className="file-input"
          />

          <div className="actions-row">
            <button type="submit" className="btn btn-primary">Upload</button>
            <a href="/sample-import-template.csv" className="btn btn-success">Download import template</a>
            <button type="button" className="btn btn-danger" onClick={handleClearData}>Delete All Data</button>
          </div>
        </form>


        {uploadMessage ? (
          <div className={`status-message ${uploadMessage.type}`}>
            {uploadMessage.text}
          </div>
        ) : null}
      </section>

      <section className="card table-card">
        <div className="table-header">
          <h2>Employees</h2>
          <div className="actions-row compact-row">
            <button type="button" className="btn btn-success" onClick={() => loadEmployees()}>Refresh</button>
          </div>
        </div>

        {loading ? (
          <p className="helper-text">Loading employees…</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Email</th>
                  <th>Basic Salary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const id = String(employee.id || '');
                  const isDeletedSent = deletedSentEmailIds.has(id);
                  const alreadySent = sentEmailIds.has(id) && !isDeletedSent;
                  const payslipGenerated = generatedPayslipIds.has(id);
                  const isEditable = editableEmailIds.has(id);
                  const showEditDeleteButtons = payslipGenerated && !isDeletedSent;
                  const showEmailButton = payslipGenerated && !isDeletedSent;
                  const emailDisabled = alreadySent || !payslipGenerated;
                  const emailText = getEmailButtonLabel({ alreadySent, isEditable });

                  return (
                    <tr key={employee.id || employee.employee_id}>
                      <td>{employee.id || ''}</td>
                      <td>{employee.employee_id || ''}</td>
                      <td>{employee.name || ''}</td>
                      <td>{employee.position || ''}</td>
                      <td>{employee.email || ''}</td>
                      <td>{employee.basic_salary || ''}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className={`btn action-btn ${payslipGenerated ? 'btn-view' : 'btn-primary'}`}
                            onClick={() => handleGenerateOrView(employee)}
                          >
                            {payslipGenerated ? 'View' : 'Generate'}
                          </button>
                          {showEditDeleteButtons ? (
                            <>
                              <button type="button" className="btn action-btn btn-edit" onClick={() => openEditModal(employee)}>Edit</button>
                              <button type="button" className="btn action-btn btn-danger" onClick={() => handleDelete(employee)}>Delete</button>
                            </>
                          ) : null}
                          {showEmailButton ? (
                            <button
                              type="button"
                              className={`btn action-btn ${alreadySent ? 'btn-muted' : 'btn-warning'}`}
                              disabled={emailDisabled}
                              onClick={() => openEditModal(employee)}
                            >
                              {emailText}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingEmployee ? (
        <div className="modal-backdrop" role="presentation" onClick={closeEditModal}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Email</h3>
              <button type="button" className="modal-close" onClick={closeEditModal}>×</button>
            </div>
            <form onSubmit={handleEmailSubmit} className="modal-form">
              <label htmlFor="editEmailInput" className="field-label">Email Address</label>
              <input
                id="editEmailInput"
                value={emailDraft}
                onChange={(event) => setEmailDraft(event.target.value)}
                type="email"
                required
                className="field-input"
              />
              <div className="actions-row modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                <button type="submit" className="btn btn-primary">Send Again</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <PayrollDashboard />
    </div>
  );
}
