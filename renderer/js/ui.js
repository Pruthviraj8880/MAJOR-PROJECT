// ============================================================
// ui.js — Small UI helpers shared across pages.
// Toast notifications, role-based visibility, and nav builder.
// ============================================================

// Show a floating message for 3 seconds (type = 'success' or 'error')
function showToast(message, type) {
  type = type || 'success';

  // Remove any existing toast first
  var old = document.querySelector('.toast');
  if (old) old.remove();

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Slide it in after a tiny delay so the CSS transition plays
  setTimeout(function () { toast.classList.add('show'); }, 10);
  setTimeout(function () { toast.remove(); }, 3000);
}

// Hide elements that aren't meant for this role.
// Any element with data-role="admin" will only show for admins, etc.
// Comma-separated: data-role="admin,faculty" means both can see it.
function applyRoleVisibility(role) {
  document.querySelectorAll('[data-role]').forEach(function (el) {
    var allowed = el.dataset.role.split(',');
    el.style.display = allowed.includes(role) ? '' : 'none';
  });
}

// Build the top navigation links based on the user's role
function buildNav(role) {
  var nav = document.getElementById('nav-links');
  if (!nav) return;

  var links = [
    { href: 'dashboard.html',  label: 'Dashboard',  roles: ['admin', 'faculty', 'student'] },
    { href: 'indicators.html', label: 'Indicators', roles: ['admin'] },
    { href: 'entries.html',    label: 'Entries',     roles: ['admin', 'faculty', 'student'] },
    { href: 'import.html',     label: 'CSV Import',  roles: ['admin', 'faculty'] },
    { href: 'approval.html',   label: 'Approvals',  roles: ['admin'] }
  ];

  nav.innerHTML = '';

  links.forEach(function (link) {
    if (!link.roles.includes(role)) return;

    var a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.label;

    // Highlight the link for the current page
    if (location.pathname.endsWith(link.href)) {
      a.classList.add('active');
    }
    nav.appendChild(a);
  });
}

// Shorthand to set text content by element ID
function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

