// ============================================================
// entries.js — Faculty & student achievement entries module.
// ============================================================

var currentUser = null;
var myEntriesList = [];
var indicatorMap = {};
var editingEntryId = null;

// Populate the indicator <select> from the API
function loadIndicatorDropdown(selectId) {
  var targetId = selectId || 'entry-indicator';
  var select = document.getElementById(targetId);
  if (!select) return;

  getIndicators().then(function (indicators) {
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
  }).catch(function () {
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
    myEntriesList = entries.filter(function (e) {
      return String(e.submittedBy) === String(user.id) || e.submittedByName === user.name;
    });
    renderMyEntriesTable(myEntriesList);
  }).catch(function () {
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

    return '<tr class="clickable-row" onclick="viewEntryDetail(\'' + e.id + '\')">' +
      '<td><strong>' + e.title + '</strong>' + vBadge + '<br><small style="color:#666;">' + (e.description ? e.description.slice(0, 45) + '…' : '') + '</small></td>' +
      '<td>' + indName + '</td>' +
      '<td>' + dateStr + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + e.status + '</span></td>' +
      '<td><button class="btn btn-outline" style="padding:3px 8px; font-size:12px;" onclick="event.stopPropagation(); viewEntryDetail(\'' + e.id + '\')">Details</button></td>' +
      '</tr>';
  }).join('');
}

function validateEntryForm(d) {
  if (!d.indicatorId) { showToast('Please select an indicator', 'error'); return false; }
  if (!d.title || !d.title.trim()) { showToast('Title is required', 'error'); return false; }
  if (!d.description || !d.description.trim()) { showToast('Description is required', 'error'); return false; }
  if (!d.date) { showToast('Achievement date is required', 'error'); return false; }
  if (d.value === '' || isNaN(Number(d.value)) || Number(d.value) <= 0) {
    showToast('Value must be a positive number', 'error');
    return false;
  }
  return true;
}

function handleEntrySubmit(event) {
  event.preventDefault();
  var payload = {
    indicatorId: document.getElementById('entry-indicator').value,
    title: document.getElementById('entry-title').value.trim(),
    description: document.getElementById('entry-desc').value.trim(),
    date: document.getElementById('entry-date').value,
    value: Number(document.getElementById('entry-val').value),
    proofLink: document.getElementById('entry-proof') ? document.getElementById('entry-proof').value.trim() : ''
  };
  if (!validateEntryForm(payload)) return;

  var saveBtn = document.getElementById('entry-save-btn');
  saveBtn.disabled = true;

  var req = editingEntryId ? updateEntry(editingEntryId, payload) : createEntry(payload);
  req.then(function (res) {
    var v = (res && res.version) ? ' (version ' + res.version + ')' : '';
    showToast(editingEntryId ? 'Entry updated' + v : 'Achievement submitted' + v, 'success');
    resetEntryForm();
    loadMyEntries();
    if (typeof showSection === 'function') showSection('section-my-entries');
  }).catch(function (err) {
    showToast(err.message, 'error');
  }).finally(function () {
    saveBtn.disabled = false;
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

// Show entry details panel including reviewer comment if rejected
function viewEntryDetail(id) {
  var entry = myEntriesList.find(function (e) { return String(e.id) === String(id); });
  var panel = document.getElementById('my-entry-detail-card');
  if (!entry || !panel) return;

  panel.style.display = 'block';
  setText('detail-card-title', entry.title);
  var vBadge = entry.version ? ' (v' + entry.version + ')' : '';
  setText('detail-card-meta', (entry.indicatorName || indicatorMap[entry.indicatorId] || 'General') + vBadge + ' • Date: ' + (entry.date || entry.createdAt || '—'));
  setText('detail-card-value', 'Reported Value: ' + (entry.value !== undefined ? entry.value : 1));
  setText('detail-card-desc', entry.description || 'No description provided.');

  var linkEl = document.getElementById('detail-card-proof');
  if (linkEl) {
    linkEl.style.display = entry.proofLink ? 'block' : 'none';
    if (entry.proofLink) linkEl.innerHTML = '<strong>Proof Link:</strong> <a href="' + entry.proofLink + '" target="_blank">' + entry.proofLink + '</a>';
  }

  var rejBox = document.getElementById('detail-rejection-comment');
  if (rejBox) {
    var hasComment = (entry.status === 'rejected' && entry.adminComment);
    rejBox.style.display = hasComment ? 'block' : 'none';
    if (hasComment) rejBox.innerHTML = '<strong>Rejection Reason:</strong><p style="margin-top:4px; color:#b91c1c;">' + entry.adminComment + '</p>';
  }

  var editBtn = document.getElementById('btn-edit-pending-entry');
  if (editBtn) {
    editBtn.style.display = (entry.status === 'pending') ? 'inline-block' : 'none';
    editBtn.onclick = function () { startEditEntry(entry); };
  }

  // Render comments & feedback thread for this entry
  if (typeof renderCommentsSection === 'function') {
    renderCommentsSection('my-entry-comments-thread', entry.id);
  }
  panel.scrollIntoView({ behavior: 'smooth' });
}

function closeEntryDetail() {
  var panel = document.getElementById('my-entry-detail-card');
  if (panel) panel.style.display = 'none';
}

function startEditEntry(entry) {
  if (entry.status !== 'pending') return showToast('Only pending entries can be edited', 'error');

  editingEntryId = entry.id;
  if (typeof showSection === 'function') showSection('section-add-entry');

  var set = function (id, v) { var el = document.getElementById(id); if (el) el.value = v; };
  set('entry-indicator', entry.indicatorId || '');
  set('entry-title', entry.title || '');
  set('entry-desc', entry.description || '');
  set('entry-date', entry.date || entry.createdAt || '');
  set('entry-val', entry.value !== undefined ? entry.value : 1);
  set('entry-proof', entry.proofLink || '');

  var btn = document.getElementById('entry-save-btn');
  if (btn) btn.textContent = 'Update Entry (Creates v' + ((entry.version || 1) + 1) + ')';
  var cancelBtn = document.getElementById('entry-cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
  var heading = document.getElementById('add-entry-heading');
  if (heading) heading.textContent = 'Edit Entry (v' + (entry.version || 1) + ')';
  closeEntryDetail();
}
