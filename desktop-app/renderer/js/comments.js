// ============================================================
// js/comments.js — Feedback & discussion thread for entries
// Allows any logged-in user (admin, faculty, student) to read
// and post comments under an entry (GET/POST /api/entries/:id/comments).
// Maximum ~150 lines for viva clarity.
// ============================================================

var currentCommentEntryId = null;

/**
 * Mounts a full comments component into any container element.
 * @param {string} containerId - DOM ID of container element
 * @param {number|string} entryId - The entry to load comments for
 */
function renderCommentsSection(containerId, entryId) {
  var container = document.getElementById(containerId);
  if (!container) return;
  currentCommentEntryId = entryId;

  container.innerHTML =
    '<div class="comments-section">' +
      '<h3>💬 Feedback & Comments</h3>' +
      '<div id="' + containerId + '-list" class="comments-list">' +
        '<div style="color:#888; font-size:13px;">Loading comments…</div>' +
      '</div>' +
      '<form id="' + containerId + '-form" class="comment-form" onsubmit="handleCommentSubmit(event, \'' + containerId + '\', ' + entryId + ')">' +
        '<textarea id="' + containerId + '-input" placeholder="Write feedback or a note on this entry…" required></textarea>' +
        '<div style="display:flex; justify-content:flex-end;">' +
          '<button type="submit" id="' + containerId + '-btn" class="btn btn-primary" style="padding:6px 14px; font-size:13px;">Post Comment</button>' +
        '</div>' +
      '</form>' +
    '</div>';

  loadCommentsForContainer(containerId, entryId);
}

/**
 * Fetches comments from API and updates the list display.
 */
function loadCommentsForContainer(containerId, entryId) {
  var listEl = document.getElementById(containerId + '-list');
  if (!listEl) return;

  getComments(entryId)
    .then(function (comments) {
      if (!comments || comments.length === 0) {
        listEl.innerHTML = '<div style="color:#888; font-size:13px; font-style:italic;">No comments yet. Be the first to leave feedback.</div>';
        return;
      }

      listEl.innerHTML = comments.map(function (c) {
        var author = c.authorName || c.userName || (c.userId ? 'User #' + c.userId : 'Anonymous');
        var dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent';
        var text = c.text || c.comment || '';

        return '<div class="comment-card">' +
          '<div class="comment-header">' +
            '<span class="comment-author">' + escapeHtml(author) + '</span>' +
            '<span class="comment-date">' + dateStr + '</span>' +
          '</div>' +
          '<div class="comment-text">' + escapeHtml(text) + '</div>' +
        '</div>';
      }).join('');
    })
    .catch(function (err) {
      listEl.innerHTML = '<div class="error-text">Failed to load comments: ' + escapeHtml(err.message) + '</div>';
    });
}

/**
 * Handles posting a new comment.
 */
function handleCommentSubmit(event, containerId, entryId) {
  event.preventDefault();
  var input = document.getElementById(containerId + '-input');
  var btn = document.getElementById(containerId + '-btn');
  var text = (input ? input.value : '').trim();

  if (!text) return showToast('Comment cannot be empty', 'error');

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Posting…';
  }

  addComment(entryId, text)
    .then(function () {
      if (input) input.value = '';
      showToast('Comment posted', 'success');
      loadCommentsForContainer(containerId, entryId);
    })
    .catch(function (err) {
      showToast(err.message || 'Failed to post comment', 'error');
    })
    .finally(function () {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Post Comment';
      }
    });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Standalone entry-detail.html page helpers
function initEntryDetailPage() {
  var id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;
  getEntry(id).then(function (e) {
    setText('detail-title', e.title);
    setText('detail-indicator', e.indicatorName || 'General');
    setText('detail-author', (e.submittedByName || 'User #' + e.submittedBy) + ' • ' + (e.date || e.createdAt || ''));
    setText('detail-description', e.description || '');
    var badge = document.getElementById('detail-status');
    if (badge) { badge.textContent = e.status; badge.className = 'badge badge-' + e.status; }
  });
  renderCommentsSection('comments-list', id);
}

function handleAddComment(event) {
  var id = new URLSearchParams(window.location.search).get('id');
  handleCommentSubmit(event, 'comments-list', id);
}
