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

// Submit a new achievement entry
function handleEntrySubmit(event) {
  event.preventDefault();
  var indicatorId = document.getElementById('entry-indicator').value;
  var title = document.getElementById('entry-title').value.trim();
  var description = document.getElementById('entry-desc').value.trim();
  var saveBtn = document.getElementById('entry-save-btn');

  if (!indicatorId) return showToast('Please pick an indicator', 'error');

  saveBtn.disabled = true;
  saveBtn.textContent = 'Submitting…';

  createEntry({ indicatorId: Number(indicatorId), title: title, description: description })
    .then(function () {
      showToast('Achievement submitted successfully!', 'success');
      document.getElementById('entry-form').reset();
      loadEntriesList();
    })
    .catch(function (err) { showToast(err.message, 'error'); })
    .finally(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Submit Achievement';
    });
}

