// ============================================================
// js/import.js — Compatibility proxy to csvImport.js
// Preserves backwards compatibility for import.html and existing callers.
// ============================================================

function initImportPage() {
  var user = requireAuth();
  if (!user) return;

  if (user.role === 'student') {
    alert('Access denied: Faculty and Admin only');
    window.location.href = 'dashboard.html';
    return;
  }

  setText('user-info', user.name + ' (' + user.role + ')');
  if (typeof buildNav === 'function') buildNav(user.role);

  if (typeof ensureIndicatorsLoaded === 'function') {
    ensureIndicatorsLoaded();
  }
}

// Map legacy handler names to csvImport.js implementations
var handleFileSelect = function (event) {
  if (typeof handleCsvFileSelect === 'function') {
    handleCsvFileSelect(event);
  }
};

var renderPreview = function () {
  if (typeof renderCsvPreview === 'function') {
    renderCsvPreview();
  }
};

var executeImport = function () {
  if (typeof executeCsvImport === 'function') {
    return executeCsvImport();
  }
};

var downloadTemplate = function () {
  if (typeof downloadSampleCsv === 'function') {
    downloadSampleCsv();
  }
};
