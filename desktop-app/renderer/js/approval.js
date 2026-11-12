// ============================================================
// approval.js — Admin review workflow (approve / reject entries).
// Only accessible to admin.
// ============================================================

var pendingList = [];
var selectedEntry = null;

function initApprovalPage() {
  var user = requireAuth();
  if (!user) return;

  if (user.role !== 'admin') {
    alert('Access denied: Admins only');
    window.location.href = 'dashboard.html';
    return;
  }

  setText('user-info', user.name + ' (' + user.role + ')');
  buildNav(user.role);

  loadPendingEntries();
}

// Fetch entries and display the ones needing review
function loadPendingEntries() {
  var tbody = document.getElementById('approval-body');
  tbody.innerHTML = '<tr><td colspan="5" style="color:#999;">Loading pending submissions…</td></tr>';

  getEntries()
    .then(function (entries) {
      pendingList = entries;
      renderApprovalTable();
    })
    .catch(function (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="error-text">Failed to load entries</td></tr>';
      showToast(err.message, 'error');
    });
}

function renderApprovalTable() {
  var tbody = document.getElementById('approval-body');
  var filter = document.getElementById('approval-filter').value;

  var filtered = pendingList.filter(function (e) {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  setText('pending-count-badge', filtered.length + ' entries');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#999;">No entries found for this filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (e) {
    var badgeClass = 'badge-' + e.status;
    return '<tr>' +
      '<td><strong>' + e.title + '</strong><br><small style="color:#666;">' + (e.description || 'No description') + '</small></td>' +
      '<td>' + (e.indicatorName || '—') + '</td>' +
      '<td>' + (e.submittedByName || 'User #' + e.submittedBy) + '<br><small style="color:#999;">' + (e.createdAt || '') + '</small></td>' +
      '<td><span class="badge ' + badgeClass + '">' + e.status + '</span></td>' +
      '<td>' +
        '<button class="btn btn-outline" style="padding:4px 10px; font-size:12px;" onclick="openReviewModal(' + e.id + ')">Review</button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

// Open review card for a specific entry
function openReviewModal(id) {
  selectedEntry = pendingList.find(function (e) { return e.id === id; });
  if (!selectedEntry) return;

  document.getElementById('review-card').style.display = 'block';
  document.getElementById('modal-entry-title').textContent = selectedEntry.title;
  document.getElementById('modal-entry-sub').textContent = 'By ' + selectedEntry.submittedByName + ' | ' + selectedEntry.indicatorName;
  document.getElementById('modal-entry-desc').textContent = selectedEntry.description || 'No detailed description provided.';
  document.getElementById('review-comment').value = '';

  // Scroll smoothly to review card
  document.getElementById('review-card').scrollIntoView({ behavior: 'smooth' });
}

function closeReviewModal() {
  selectedEntry = null;
  document.getElementById('review-card').style.display = 'none';
}

// Submit approval or rejection
function submitDecision(status) {
  if (!selectedEntry) return;

  var comment = document.getElementById('review-comment').value.trim();

  // If rejecting, strongly encourage or require a reason
  if (status === 'rejected' && !comment) {
    showToast('Please provide a feedback comment when rejecting', 'error');
    return;
  }

  var btnApprove = document.getElementById('btn-approve');
  var btnReject = document.getElementById('btn-reject');
  btnApprove.disabled = true;
  btnReject.disabled = true;

  updateEntryStatus(selectedEntry.id, status, comment)
    .then(function () {
      showToast('Entry marked as ' + status, 'success');
      closeReviewModal();
      loadPendingEntries();
    })
    .catch(function (err) {
      showToast(err.message, 'error');
    })
    .finally(function () {
      btnApprove.disabled = false;
      btnReject.disabled = false;
    });
}

