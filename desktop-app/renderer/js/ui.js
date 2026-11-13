// ============================================================
// ui.js — Role-based menu and page section switcher.
// ============================================================

// Menu definitions for each user role
var ROLE_MENUS = {
  admin: [
    { id: 'section-indicators', label: 'Indicators' },
    { id: 'section-all-entries', label: 'All Entries' },
    { id: 'section-approvals', label: 'Approvals' },
    { id: 'section-import-csv', label: 'Import CSV' }
  ],
  faculty: [
    { id: 'section-my-entries', label: 'My Entries' },
    { id: 'section-add-entry', label: 'Add Entry' },
    { id: 'section-import-csv', label: 'Import CSV' }
  ],
  student: [
    { id: 'section-my-entries', label: 'My Entries' },
    { id: 'section-add-entry', label: 'Add Entry' }
  ]
};

// Generates the left sidebar menu items based on the user's role
function buildSidebarMenu(role) {
  var menuContainer = document.getElementById('sidebar-menu');
  if (!menuContainer) return;

  var normalizedRole = (role || '').toLowerCase();
  var items = ROLE_MENUS[normalizedRole] || [];

  menuContainer.innerHTML = '';

  items.forEach(function (item, idx) {
    var btn = document.createElement('button');
    btn.className = 'menu-item' + (idx === 0 ? ' active' : '');
    btn.dataset.section = item.id;
    btn.textContent = item.label;
    btn.onclick = function () {
      showSection(item.id);
    };
    menuContainer.appendChild(btn);
  });

  // Automatically show the first section on load
  if (items.length > 0) {
    showSection(items[0].id);
  }
}

// Shows the right page section when a menu item is clicked
function showSection(sectionId) {
  // 1. Hide all page sections in the content area
  var sections = document.querySelectorAll('.page-section');
  sections.forEach(function (sec) {
    sec.style.display = 'none';
  });

  // 2. Show the requested section
  var target = document.getElementById(sectionId);
  if (target) {
    target.style.display = 'block';
  }

  // 3. Mark the clicked button as active in the sidebar
  var buttons = document.querySelectorAll('#sidebar-menu .menu-item');
  buttons.forEach(function (btn) {
    if (btn.dataset.section === sectionId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 4. Hook to refresh section data if handler exists
  if (typeof window.onSectionActivated === 'function') {
    window.onSectionActivated(sectionId);
  }
}

// Floating toast notification (success or error)
function showToast(message, type) {
  type = type || 'success';
  var old = document.querySelector('.toast');
  if (old) old.remove();

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () { toast.classList.add('show'); }, 10);
  setTimeout(function () { toast.remove(); }, 3000);
}

// Shorthand helper to set text content
function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}
