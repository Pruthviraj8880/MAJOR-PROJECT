// ============================================================
// entries.js — Handles submitting, listing, filtering, and export.
// ============================================================
var currentUser = null;
var allEntries = [];
var indicatorMap = {};
var editingEntryId = null;

function initEntriesPage() {
  currentUser = requireAuth();
  if (!currentUser) return;
  loadIndicatorDropdown('entry-indicator');
  loadEntriesList();
}

// Populate the indicator <select> from the API
function loadIndicatorDropdown(selectId) {
  var targetId = selectId || 'entry-indicator';
  var select = document.getElementById(targetId);
  if (!select) return;

  getIndicators()
    .then(function (indicators) {
      select.innerHTML = '<option value="">-- Select Indicator Type --</option>';
      indicators.forEach(function (ind) {
        indicatorMap[ind.id] = ind.name;
        if (ind.isActive !== false) {
          var opt = document.createElement('option');
          opt.value = ind.id;
          opt.textContent = ind.name + (ind.category ? ' (' + ind.category + ')' : '');
          select.appendChild(opt);
        }
      });
    })
    .catch(function () {
      showToast('Could not load indicators', 'error');
    });
}

// Load and display entries submitted by current user
function loadMyEntries() {
  var tbody = document.getElementById('my-entries-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="color:#999;">Loading your entries…</td></tr>';

  var user = currentUser || getCurrentUser();
  if (!user) return;

  getEntries().then(function (entries) {
    allEntries = entries;
    var mine = entries.filter(function (e) {
      return String(e.submittedBy) === String(user.id) || e.submittedByName === user.name;
    });
    renderMyEntriesTable(mine);
  }).catch(function (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="error-text">Failed to load entries</td></tr>';
  });
}

function renderMyEntriesTable(entries) {
  var tbody = document.getElementById('my-entries-body');
  if (!tbody) return;

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#999;">No entries submitted yet.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(function (e) {
    var badgeClass = 'badge-' + (e.status || 'pending');
    var vBadge = e.version ? '<span class="badge-version">v' + e.version + '</span>' : '';
    var dateStr = e.date || e.createdAt || '—';
    var indName = e.indicatorName || indicatorMap[e.indicatorId] || '—';

    return '<tr class="clickable-row" onclick="viewEntryDetail(' + e.id + ')">' +
      '<td><strong>' + e.title + '</strong>' + vBadge + '<br><small style="color:#666;">' + (e.description ? e.description.slice(0, 45) + '…' : '') + '</small></td>' +
      '<td>' + indName + '</td>' +
      '<td>' + dateStr + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + e.status + '</span></td>' +
      '<td><button class="btn btn-outline" style="padding:3px 8px; font-size:12px;" onclick="event.stopPropagation(); viewEntryDetail(' + e.id + ')">Details</button></td>' +
      '</tr>';
  }).join('');
}

// Load and render all entries from backend
function loadEntriesList() {
  var tbody = document.getElementById('entries-body');
  tbody.innerHTML = '<tr><td colspan="5" style="color:#999;">Loading entries…</td></tr>';

  getEntries()
    .then(function (entries) {
      allEntries = entries;
      renderEntriesTable(entries);
    })
    .catch(function (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="error-text">Failed to load entries</td></tr>';
      showToast(err.message, 'error');
    });
}

// Render entries into table with status badges and action links
function renderEntriesTable(entries) {
  var tbody = document.getElementById('entries-body');
  var filterValue = document.getElementById('filter-status').value;
  var search = (document.getElementById('search-keyword').value || '').toLowerCase();

  var filtered = entries.filter(function (e) {
    var matchStatus = (filterValue === 'all') || (e.status === filterValue);
    var matchSearch = !search || e.title.toLowerCase().includes(search) || (e.description || '').toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#999;">No matching entries found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (e) {
    var badgeClass = 'badge-' + e.status;
    return '<tr>' +
      '<td><strong>' + e.title + '</strong><br><small style="color:#666;">' + (e.description || '') + '</small></td>' +
      '<td>' + (e.indicatorName || indicatorMap[e.indicatorId] || '—') + '</td>' +
      '<td>' + (e.submittedByName || 'User #' + e.submittedBy) + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + e.status + '</span></td>' +
      '<td>' +
        '<a href="entry-detail.html?id=' + e.id + '" class="btn btn-outline" style="padding:4px 8px; font-size:12px; text-decoration:none;">View / Comments</a>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// Export currently displayed entries to CSV for institutional reporting
function exportEntriesToCsv() {
  if (allEntries.length === 0) {
    showToast('No entries available to export', 'error');
    return;
  }

  var headers = ['ID', 'Title', 'Indicator', 'SubmittedBy', 'Status', 'Date'];
  var rows = allEntries.map(function (e) {
    return [
      e.id,
      '"' + (e.title || '').replace(/"/g, '""') + '"',
      '"' + (e.indicatorName || indicatorMap[e.indicatorId] || '').replace(/"/g, '""') + '"',
      '"' + (e.submittedByName || '').replace(/"/g, '""') + '"',
      e.status,
      e.createdAt || ''
    ].join(',');
  });

  var csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(',')].concat(rows).join('\n');
  var encodedUri = encodeURI(csvContent);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'innovation_entries_report.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Exported ' + allEntries.length + ' entries to CSV', 'success');
}

// Validate required fields: indicator, title, description, date, value
function validateEntryForm(data) {
  if (!data.indicatorId) {
    showToast('Please select an indicator type', 'error');
    return false;
  }
  if (!data.title || data.title.trim() === '') {
    showToast('Title is required', 'error');
    return false;
  }
  if (!data.description || data.description.trim() === '') {
    showToast('Description is required', 'error');
    return false;
  }
  if (!data.date) {
    showToast('Achievement date is required', 'error');
    return false;
  }
  if (data.value === '' || isNaN(Number(data.value)) || Number(data.value) <= 0) {
    showToast('Please enter a valid positive numeric value', 'error');
    return false;
  }
  return true;
}

// Submit or edit an achievement entry
function handleEntrySubmit(event) {
  event.preventDefault();
  var payload = {
    indicatorId: document.getElementById('entry-indicator').value,
    title: document.getElementById('entry-title').value.trim(),
    description: document.getElementById('entry-desc').value.trim(),
    date: document.getElementById('entry-date').value,
    value: document.getElementById('entry-val').value,
    proofLink: (document.getElementById('entry-proof') ? document.getElementById('entry-proof').value.trim() : '')
  };

  if (!validateEntryForm(payload)) return;

  var saveBtn = document.getElementById('entry-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = editingEntryId ? 'Updating…' : 'Submitting…';

  var req = editingEntryId ? updateEntry(editingEntryId, payload) : createEntry(payload);
  req.then(function (result) {
    var vText = (result && result.version) ? ' (version ' + result.version + ')' : '';
    showToast(editingEntryId ? 'Entry updated successfully' + vText : 'Achievement submitted successfully' + vText, 'success');
    resetEntryForm();
    if (typeof loadMyEntries === 'function') loadMyEntries();
    if (typeof showSection === 'function') showSection('section-my-entries');
  }).catch(function (err) {
    showToast(err.message, 'error');
  }).finally(function () {
    saveBtn.disabled = false;
    saveBtn.textContent = editingEntryId ? 'Update Entry' : 'Submit Achievement';
  });
}

function resetEntryForm() {
  editingEntryId = null;
  var form = document.getElementById('entry-form');
  if (form) form.reset();
  var btn = document.getElementById('entry-save-btn');
  if (btn) btn.textContent = 'Submit Achievement';
  var cancelBtn = document.getElementById('entry-cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  var title = document.getElementById('add-entry-heading');
  if (title) title.textContent = 'Submit Achievement';
}

