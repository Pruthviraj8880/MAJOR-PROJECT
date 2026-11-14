// ============================================================
// js/approvals.js — Admin approval workflow and review drawer
// Admin table of pending entries with submitter, indicator, title, date.
// Clicking an entry opens detail view with Approve/Reject & feedback.
// Maximum ~150 lines for viva clarity.
// ============================================================

var pendingSubmissions = [];
var selectedApprovalEntry = null;

/**
 * Loads pending submissions and updates the approvals table.
 */
function loadApprovalsDashboard() {
  var tbody = document.getElementById('approvals-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="color:#888;">Loading submissions…</td></tr>';

  getEntries()
    .then(function (entries) {
      pendingSubmissions = entries || [];
      renderApprovalsTable();
    })
    .catch(function (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="error-text">Failed to load entries: ' + escapeHtml(err.message) + '</td></tr>';
    });
}

/**
 * Renders the approvals table with submitter, indicator, title, and date.
 */
function renderApprovalsTable() {
  var tbody = document.getElementById('approvals-body');
  var countBadge = document.getElementById('approval-count-badge');
  if (!tbody) return;

  var filterSelect = document.getElementById('approval-filter-select');
  var filter = filterSelect ? filterSelect.value : 'pending';

  var filtered = pendingSubmissions.filter(function (e) {
    if (filter === 'all') return true;
    return (e.status || '').toLowerCase() === filter;
  });

  if (countBadge) countBadge.textContent = filtered.length + ' entries';

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#888; text-align:center; padding:20px;">No pending entries to review.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (e) {
    var submitter = e.submittedByName || (e.submittedBy ? 'User #' + e.submittedBy : 'Unknown');
    var indName = e.indicatorName || ('Indicator #' + e.indicatorId);
    var dateStr = e.date || (e.createdAt ? e.createdAt.slice(0, 10) : '—');
    var badgeClass = 'badge-' + (e.status || 'pending').toLowerCase();

    return '<tr class="clickable-row" onclick="openApprovalReview(' + e.id + ')">' +
      '<td><strong>' + escapeHtml(e.title) + '</strong><br><small style="color:#666;">' + escapeHtml((e.description || '').slice(0, 60)) + '…</small></td>' +
      '<td>' + escapeHtml(indName) + '</td>' +
      '<td>' + escapeHtml(submitter) + '</td>' +
      '<td>' + escapeHtml(dateStr) + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + (e.status || 'pending') + '</span></td>' +
    '</tr>';
  }).join('');
}

/**
 * Opens detail drawer for approval decision.
 */
function openApprovalReview(id) {
  selectedApprovalEntry = pendingSubmissions.find(function (e) { return e.id === id; });
  if (!selectedApprovalEntry) return;

  var card = document.getElementById('approval-review-card');
  if (!card) return;

  card.style.display = 'block';
  setText('review-entry-title', selectedApprovalEntry.title);
  var submitter = selectedApprovalEntry.submittedByName || ('User #' + selectedApprovalEntry.submittedBy);
  var dateStr = selectedApprovalEntry.date || (selectedApprovalEntry.createdAt ? selectedApprovalEntry.createdAt.slice(0, 10) : '—');
  setText('review-entry-meta', 'Submitted by ' + submitter + ' • ' + (selectedApprovalEntry.indicatorName || '') + ' • ' + dateStr);
  setText('review-entry-desc', selectedApprovalEntry.description || 'No description provided.');

  var valEl = document.getElementById('review-entry-val');
  if (valEl) valEl.textContent = 'Value: ' + (selectedApprovalEntry.value != null ? selectedApprovalEntry.value : '—');

  var proofEl = document.getElementById('review-entry-proof');
  if (proofEl) {
    if (selectedApprovalEntry.proofLink) {
      proofEl.innerHTML = '<strong>Proof Link:</strong> <a href="' + escapeHtml(selectedApprovalEntry.proofLink) + '" target="_blank" style="color:var(--primary);">' + escapeHtml(selectedApprovalEntry.proofLink) + '</a>';
      proofEl.style.display = 'block';
    } else {
      proofEl.style.display = 'none';
    }
  }

  var commentInput = document.getElementById('review-comment-input');
  if (commentInput) commentInput.value = '';

  // Render comments section under the entry
  if (typeof renderCommentsSection === 'function') {
    renderCommentsSection('approval-comments-thread', selectedApprovalEntry.id);
  }

  card.scrollIntoView({ behavior: 'smooth' });
}

function closeApprovalReview() {
  selectedApprovalEntry = null;
  var card = document.getElementById('approval-review-card');
  if (card) card.style.display = 'none';
}

/**
 * Handles decision (approve or reject) and calls PUT /api/entries/:id/status.
 * Rejection requires comment validation.
 */
function submitApprovalDecision(status) {
  if (!selectedApprovalEntry) return;

  var commentInput = document.getElementById('review-comment-input');
  var comment = (commentInput ? commentInput.value : '').trim();

  // Validate comment required on rejection
  if (status === 'rejected' && !comment) {
    return showToast('Feedback comment is required when rejecting an entry', 'error');
  }

  var btnApprove = document.getElementById('btn-approve-decision');
  var btnReject = document.getElementById('btn-reject-decision');
  if (btnApprove) btnApprove.disabled = true;
  if (btnReject) btnReject.disabled = true;

  updateEntryStatus(selectedApprovalEntry.id, status, comment)
    .then(function () {
      showToast('Entry marked as ' + status, 'success');
      closeApprovalReview();
      loadApprovalsDashboard();
    })
    .catch(function (err) {
      showToast(err.message || 'Status update failed', 'error');
    })
    .finally(function () {
      if (btnApprove) btnApprove.disabled = false;
      if (btnReject) btnReject.disabled = false;
    });
}
