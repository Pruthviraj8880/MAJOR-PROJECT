// ============================================================
// entries.js — Handles submitting, listing, and filtering entries.
// Used by all roles (student, faculty, admin).
// ============================================================

var currentUser = null;
var allEntries = [];
var indicatorMap = {}; // Maps indicator ID to Name

function initEntriesPage() {
  currentUser = requireAuth();
  if (!currentUser) return;

  setText('user-info', currentUser.name + ' (' + currentUser.role + ')');
  buildNav(currentUser.role);

  // Load dropdown options and existing entries
  loadIndicatorDropdown();
  loadEntriesList();
}

// Populate the indicator <select> in the form
function loadIndicatorDropdown() {
  var select = document.getElementById('entry-indicator');

  getIndicators()
    .then(function (indicators) {
      select.innerHTML = '<option value="">-- Select Indicator Type --</option>';
      indicators.forEach(function (ind) {
        indicatorMap[ind.id] = ind.name;
        var opt = document.createElement('option');
        opt.value = ind.id;
        opt.textContent = ind.name + (ind.category ? ' (' + ind.category + ')' : '');
        select.appendChild(opt);
      });
    })
    .catch(function (err) {
      showToast('Could not load indicators for dropdown', 'error');
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

  // Filter option: faculty/student may want to see all vs only theirs
  var filterValue = document.getElementById('filter-status').value;
  var filtered = entries.filter(function (e) {
    if (filterValue === 'all') return true;
    return e.status === filterValue;
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

// Submit a new achievement entry
function handleEntrySubmit(event) {
  event.preventDefault();

  var indicatorId = document.getElementById('entry-indicator').value;
  var title = document.getElementById('entry-title').value.trim();
  var description = document.getElementById('entry-desc').value.trim();
  var saveBtn = document.getElementById('entry-save-btn');

  if (!indicatorId) {
    showToast('Please pick an indicator', 'error');
    return;
  }

  var payload = {
    indicatorId: Number(indicatorId),
    title: title,
    description: description
  };

  saveBtn.disabled = true;
  saveBtn.textContent = 'Submitting…';

  createEntry(payload)
    .then(function () {
      showToast('Achievement submitted successfully!', 'success');
      document.getElementById('entry-form').reset();
      loadEntriesList();
    })
    .catch(function (err) {
      showToast(err.message, 'error');
    })
    .finally(function () {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Submit Achievement';
    });
}
