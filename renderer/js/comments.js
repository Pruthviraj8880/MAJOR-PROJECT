// ============================================================
// comments.js — Handles displaying entry details and comment thread.
// Students, faculty, and admins can view and post feedback comments.
// ============================================================

var currentEntryId = null;

function initEntryDetailPage() {
  var user = requireAuth();
  if (!user) return;

  setText('user-info', user.name + ' (' + user.role + ')');
  buildNav(user.role);

  // Extract ?id=... from the page URL
  var params = new URLSearchParams(window.location.search);
  currentEntryId = params.get('id');

  if (!currentEntryId) {
    alert('No entry ID provided');
    window.location.href = 'entries.html';
    return;
  }

  loadEntryDetails();
  loadCommentsList();
}

// Fetch and display entry metadata
function loadEntryDetails() {
  getEntry(currentEntryId)
    .then(function (entry) {
      setText('detail-title', entry.title);
      setText('detail-indicator', entry.indicatorName || 'General');
      setText('detail-author', (entry.submittedByName || 'User #' + entry.submittedBy) + ' on ' + (entry.createdAt || ''));
      setText('detail-description', entry.description || 'No description provided.');

      var badge = document.getElementById('detail-status');
      badge.textContent = entry.status;
      badge.className = 'badge badge-' + entry.status;
    })
    .catch(function (err) {
      showToast('Could not load entry: ' + err.message, 'error');
    });
}

// Fetch all comments/feedback for this entry
function loadCommentsList() {
  var container = document.getElementById('comments-list');
  container.innerHTML = '<div style="color:#999; font-size:13px;">Loading comments…</div>';

  getComments(currentEntryId)
    .then(function (comments) {
      if (comments.length === 0) {
        container.innerHTML = '<div style="color:#999; font-size:13px; font-style:italic;">No comments yet. Start the discussion below.</div>';
        return;
      }

      container.innerHTML = comments.map(function (c) {
        return '<div style="border-bottom:1px solid var(--border); padding:10px 0;">' +
          '<div style="display:flex; justify-content:space-between; margin-bottom:4px;">' +
            '<strong style="font-size:13px; color:var(--text);">' + (c.authorName || 'User #' + c.userId) + '</strong>' +
            '<span style="font-size:12px; color:#999;">' + (c.createdAt || '') + '</span>' +
          '</div>' +
          '<div style="font-size:14px; color:#444; white-space:pre-wrap;">' + c.text + '</div>' +
          '</div>';
      }).join('');
    })
    .catch(function (err) {
      container.innerHTML = '<div class="error-text">Failed to load comments</div>';
    });
}

// Post a new comment
function handleAddComment(event) {
  event.preventDefault();

  var input = document.getElementById('new-comment-text');
  var text = input.value.trim();
  var submitBtn = document.getElementById('btn-post-comment');

  if (!text) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';

  addComment(currentEntryId, text)
    .then(function () {
      input.value = '';
      showToast('Comment posted', 'success');
      loadCommentsList();
    })
    .catch(function (err) {
      showToast(err.message, 'error');
    })
    .finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Post Comment';
    });
}

