// ============================================================
// indicators.js — Handles CRUD operations for indicator types.
// Accessible to admin users only.
// ============================================================

var editingIndicatorId = null;

function initIndicatorsPage() {
  var user = requireAuth();
  if (!user) return;
  if (user.role !== 'admin') {
    alert('Access denied: Admins only');
    window.location.href = 'dashboard.html';
    return;
  }
  loadIndicatorsTable();
}

// Fetch all indicators from backend and display in the table
function loadIndicatorsTable() {
  var tbody = document.getElementById('indicators-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="color:#999;">Loading indicators…</td></tr>';

  getIndicators().then(function (indicators) {
    if (indicators.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:#999;">No indicators found.</td></tr>';
      return;
    }

    tbody.innerHTML = indicators.map(function (item) {
      var active = (item.isActive !== false);
      var badge = active ? '<span class="badge badge-active">Active</span>' : '<span class="badge badge-inactive">Inactive</span>';
      var dept = (item.department && typeof item.department === 'object') ? item.department.name : (item.department || '—');
      var editArgs = [item.id, item.name, item.category, item.unit, dept === '—' ? '' : dept, active]
        .map(function (v) { return typeof v === 'string' ? "'" + escapeQuotes(v) + "'" : v; }).join(', ');

      return '<tr>' +
        '<td><strong>' + item.name + '</strong></td>' +
        '<td>' + (item.category || '—') + '</td>' +
        '<td>' + (item.unit || 'count') + '</td>' +
        '<td>' + dept + '</td>' +
        '<td>' + badge + '</td>' +
        '<td>' +
          '<button class="btn btn-outline" style="padding:3px 8px; font-size:12px; margin-right:6px;" onclick="startEditIndicator(' + editArgs + ')">Edit</button>' +
          '<button class="btn btn-danger" style="padding:3px 8px; font-size:12px;" onclick="handleDeleteIndicator(\'' + item.id + '\')">Delete</button>' +
        '</td></tr>';
    }).join('');
  }).catch(function (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="error-text">Failed to load indicators</td></tr>';
    showToast(err.message, 'error');
  });
}

function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function startEditIndicator(id, name, category, unit, department, isActive) {
  editingIndicatorId = id;
  var titleEl = document.getElementById('ind-form-title') || document.getElementById('form-title');
  if (titleEl) titleEl.textContent = 'Edit Indicator';
  setVal('ind-name', name || '');
  setVal('ind-category', category || 'Research');
  setVal('ind-unit', unit || 'count');
  setVal('ind-dept', department || '');
  var activeEl = document.getElementById('ind-active');
  if (activeEl) activeEl.checked = (isActive !== false);
  var saveBtn = document.getElementById('ind-save-btn');
  if (saveBtn) saveBtn.textContent = 'Update Indicator';
  var cancelBtn = document.getElementById('ind-cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

function resetIndicatorForm() {
  editingIndicatorId = null;
  var titleEl = document.getElementById('ind-form-title') || document.getElementById('form-title');
  if (titleEl) titleEl.textContent = 'Add New Indicator';
  var form = document.getElementById('indicator-form');
  if (form) form.reset();
  var activeEl = document.getElementById('ind-active');
  if (activeEl) activeEl.checked = true;
  var saveBtn = document.getElementById('ind-save-btn');
  if (saveBtn) saveBtn.textContent = 'Create Indicator';
  var cancelBtn = document.getElementById('ind-cancel-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val;
}

// Validate that indicator name is not empty
function validateIndicatorName(name) {
  if (!name || name.trim() === '') {
    showToast('Indicator name is required and cannot be empty', 'error');
    var input = document.getElementById('ind-name');
    if (input) input.focus();
    return false;
  }
  return true;
}

// Handle form submit (both Create and Update)
function handleIndicatorSubmit(event) {
  event.preventDefault();
  var name = document.getElementById('ind-name').value.trim();
  if (!validateIndicatorName(name)) return;

  var categoryEl = document.getElementById('ind-category');
  var unitEl = document.getElementById('ind-unit');
  var deptEl = document.getElementById('ind-dept');
  var activeEl = document.getElementById('ind-active');

  var payload = {
    name: name,
    category: categoryEl ? categoryEl.value : 'Research',
    unit: unitEl ? unitEl.value : 'count',
    department: deptEl ? deptEl.value.trim() : '',
    isActive: activeEl ? activeEl.checked : true
  };

  var saveBtn = document.getElementById('ind-save-btn');
  saveBtn.disabled = true;

  var req = editingIndicatorId ? updateIndicator(editingIndicatorId, payload) : createIndicator(payload);
  req.then(function () {
    showToast(editingIndicatorId ? 'Indicator updated' : 'Indicator created', 'success');
    resetIndicatorForm();
    loadIndicatorsTable();
  }).catch(function (err) {
    showToast(err.message, 'error');
  }).finally(function () {
    saveBtn.disabled = false;
  });
}

// Handle Delete with explicit user confirmation
function handleDeleteIndicator(id) {
  if (!confirm('Are you sure you want to delete this indicator? This action cannot be undone.')) return;
  deleteIndicator(id).then(function () {
    showToast('Indicator deleted successfully', 'success');
    if (editingIndicatorId === id) resetIndicatorForm();
    loadIndicatorsTable();
  }).catch(function (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  });
}

