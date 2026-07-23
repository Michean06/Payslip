const { normalizeEmployee } = require('./utils/employeeNormalizer');
const employees = [];
let nextId = 1;

function addEmployees(items) {
  const added = [];
  items.forEach((item) => {
    const normalized = normalizeEmployee(item);
    normalized.id = item && item.id != null ? item.id : nextId++;
    normalized.created_at = normalized.created_at || new Date().toISOString();
    employees.push(normalized);
    added.push(normalized);
  });
  return added;
}

function listEmployees() {
  return employees.slice();
}

function getEmployeeById(id) {
  return employees.find((employee) => String(employee.id) === String(id));
}

function clearPayrollRecords() {
  const deletedCount = employees.length;
  employees.length = 0;
  nextId = 1;
  return deletedCount;
}

module.exports = {
  addEmployees,
  listEmployees,
  getEmployeeById,
  clearPayrollRecords
};
