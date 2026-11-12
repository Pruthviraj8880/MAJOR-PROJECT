// ============================================================
// indicators.js — Handles CRUD operations for indicator types.
// Only accessible to admin users.
// ============================================================

// If null, form creates a new indicator; if set to an ID, form updates it
var editingIndicatorId = null;

// Runs when the page loads
function initIndicatorsPage() {
  var user = requireAuth();
  if (!user) return;

  // Role check: Only admin should manage indicators
  if (user.role !== 'admin') {
    alert('Access denied: Admins only');
    window.location.href = 'dashboard.html';
    return;
  }

  setText('user-info', user.name + ' (' + user.role + ')');
  buildNav(user.role);

  loadIndicatorsTable();
}

// Fetch all indicators from backend and display in the table
function loadIndicatorsTable() {
  var tbody = document.getElementById('indicators-body');
  tbody.innerHTML = '<tr><td colspan="4" style="color:#999;">Loading…</td></tr>';

  getIndicators()
    .then(function (indicators) {
      if (indicators.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:#999;">No indicators created yet.</td></tr>';
        return;
      }

      tbody.innerHTML = indicators.map(function (item) {
        return '<tr>' +
          '<td><strong>' + item.name + '</strong></td>' +
          '<td>' + (item.category || 'General') + '</td>' +
          '<td>' + (item.description || '—') + '</td>' +
          '<td>' +
            '<button class="btn btn-outline" style="padding:4px 8px; font-size:12px; margin-right:6px;" onclick="startEditIndicator(' + item.id + ', \'' + escapeQuotes(item.name) + '\', \'' + escapeQuotes(item.category || '') + '\', \'' + escapeQuotes(item.description || '') + '\')">Edit</button>' +
            '<button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="handleDeleteIndicator(' + item.id + ')">Delete</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    })
    .catch(function (err) {
      tbody.innerHTML = '<tr><td colspan="4" class="error-text">Failed to load indicators</td></tr>';
      showToast(err.message, 'error');
    });
}

// Helper to prevent quotes from breaking inline onclick handlers
function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Populate form when clicking 'Edit'
function startEditIndicator(id, name, category, description) {
  editingIndicatorId = id;
  document.getElementById('form-title').textContent = 'Edit Indicator';
  document.getElementById('ind-name').value = name;
  document.getElementById('ind-category').value = category;
  document.getElementById('ind-desc').value = description;

  document.getElementById('ind-save-btn').textContent = 'Update Indicator';
  document.getElementById('ind-cancel-btn').style.display = 'inline-block';
}

// Reset form back to 'Create' mode
function resetIndicatorForm() {
  editingIndicatorId = null;
  document.getElementById('form-title').textContent = 'Add New Indicator';
  document.getElementById('indicator-form').reset();

  document.getElementById('ind-save-btn').textContent = 'Create Indicator';
  document.getElementById('ind-cancel-btn').style.display = 'none';
}

// Handle form submit (both Create and Update)
function handleIndicatorSubmit(event) {
  event.preventDefault();

  var name = document.getElementById('ind-name').value.trim();
  var category = document.getElementById('ind-category').value.trim();
  var description = document.getElementById('ind-desc').value.trim();

  if (!name) {
    showToast('Name is required', 'error');
    return;
  }

  var payload = { name: name, category: category, description: description };
  var saveBtn = document.getElementById('ind-save-btn');
  saveBtn.disabled = true;

  var promise = editingIndicatorId
    ? updateIndicator(editingIndicatorId, payload)
    : createIndicator(payload);

  promise
    .then(function () {
      showToast(editingIndicatorId ? 'Indicator updated' : 'Indicator created', 'success');
      resetIndicatorForm();
      loadIndicatorsTable();
    })
    .catch(function (err) {
      showToast(err.message, 'error');
    })
    .finally(function () {
      saveBtn.disabled = false;
    });
}

// Handle Delete with confirmation
function handleDeleteIndicator(id) {
  if (!confirm('Are you sure you want to delete this indicator?')) return;

  deleteIndicator(id)
    .then(function () {
      showToast('Indicator deleted', 'success');
      loadIndicatorsTable();
    })
    .catch(function (err) {
      showToast(err.message, 'error');
    });
}
