// ============================================================
// js/approval.js — Compatibility proxy to approvals.js
// ============================================================
// Preserves backwards compatibility for approval.html

function initApprovalPage() {
  var user = requireAuth();
  if (!user || user.role !== 'admin') {
    alert('Access denied: Admins only');
    window.location.href = 'dashboard.html';
    return;
  }
  loadApprovalsDashboard();
}

var loadPendingEntries = loadApprovalsDashboard;
var openReviewModal = openApprovalReview;
var closeReviewModal = closeApprovalReview;
var submitDecision = submitApprovalDecision;
