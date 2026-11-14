// ============================================================
// reports.js — Comprehensive Innovation Reports & Exports
// Follows vanilla JS style. Consumes apiRequest() and requireAuth().
// Uses jsPDF to export formatted landscape A4 PDF reports and
// native Blob API for clean CSV downloads.
// ============================================================

var currentUser = null;
var allScopedEntries = [];
var filteredEntries = [];

/**
 * Normalizes an entry from either mock server or real backend payload.
 */
function normalizeEntry(raw, deptMap) {
  if (!raw) return null;
  deptMap = deptMap || {};

  var rawStatus = (raw.status || '').toString().toLowerCase().trim();
  var normalizedStatus = rawStatus;
  if (rawStatus === 'submitted' || rawStatus === 'draft') {
    normalizedStatus = 'pending';
  }

  var indicatorName = raw.indicatorName ||
    (raw.indicator && raw.indicator.name) ||
    'Unknown Indicator';

  var indicatorId = raw.indicatorId ||
    (raw.indicator && raw.indicator.id) ||
    null;

  var userId = raw.createdById ||
    raw.submittedBy ||
    (raw.createdBy && raw.createdBy.id) ||
    null;

  var person = raw.submittedByName ||
    (raw.createdBy && raw.createdBy.name) ||
    (raw.submittedBy ? 'User #' + raw.submittedBy : 'Unknown');

  var department = 'Unknown';
  if (indicatorId && deptMap[indicatorId]) {
    department = deptMap[indicatorId];
  } else if (raw.indicator && raw.indicator.department && raw.indicator.department.name) {
    department = raw.indicator.department.name;
  } else if (raw.departmentName) {
    department = raw.departmentName;
  }

  var date = raw.createdAt ? new Date(raw.createdAt) : new Date();
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  var year = date.getFullYear();
  var dateStr = date.toISOString().slice(0, 10);

  return {
    id: raw.id,
    title: raw.title || 'Untitled',
    description: raw.description || '',
    status: normalizedStatus, // 'pending', 'approved', 'rejected'
    rawStatus: rawStatus,
    indicatorId: indicatorId,
    indicatorName: indicatorName,
    userId: userId,
    person: person,
    department: department,
    year: year,
    date: date,
    dateStr: dateStr,
    createdAt: raw.createdAt
  };
}

/**
 * Loads indicator -> department mapping from /api/indicators.
 */
async function loadIndicatorDepartmentMap() {
  var deptMap = {};
  try {
    var res = await apiRequest('/api/indicators');
    var indicators = Array.isArray(res) ? res : (res && res.indicators ? res.indicators : []);

    indicators.forEach(function (ind) {
      var deptName = 'Unknown';
      if (ind.department && ind.department.name) {
        deptName = ind.department.name;
      } else if (ind.departmentName) {
        deptName = ind.departmentName;
      }
      deptMap[ind.id] = deptName;
    });
  } catch (err) {
    console.warn('Could not load indicator department mapping:', err);
  }
  return deptMap;
}

/**
 * Fetches all entries with pagination support.
 */
async function fetchAllEntries() {
  var firstRes = await apiRequest('/api/entries?page=1&limit=100');

  if (Array.isArray(firstRes)) {
    return firstRes;
  }

  if (firstRes && Array.isArray(firstRes.entries)) {
    var all = firstRes.entries.slice();
    var totalPages = (firstRes.pagination && firstRes.pagination.totalPages) ? firstRes.pagination.totalPages : 1;

    for (var p = 2; p <= totalPages; p++) {
      var pageRes = await apiRequest('/api/entries?page=' + p + '&limit=100');
      if (pageRes && Array.isArray(pageRes.entries)) {
        all = all.concat(pageRes.entries);
      }
    }
    return all;
  }

  return [];
}

/**
 * Main initializer for Reports page.
 */
async function initReports() {
  currentUser = requireAuth();
  if (!currentUser) return;

  var userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.textContent = currentUser.name + ' (' + currentUser.role + ')';
  }

  var bannerEl = document.getElementById('role-info-banner');
  if (bannerEl) {
    if (currentUser.role === 'admin') {
      bannerEl.innerHTML = '🛡️ <strong>Admin View:</strong> Viewing all institutional innovation entries across all departments.';
    } else {
      bannerEl.innerHTML = '👤 <strong>Personal View:</strong> Scoped to your submissions only (' + escapeHtml(currentUser.name) + ').';
    }
  }

  showReportsState('loading');

  try {
    var results = await Promise.all([
      loadIndicatorDepartmentMap(),
      fetchAllEntries()
    ]);

    var indicatorDeptMap = results[0];
    var allEntries = results[1] || [];

    // Normalize all entries
    var entries = allEntries
      .map(function (raw) { return normalizeEntry(raw, indicatorDeptMap); })
      .filter(Boolean);

    // Role-based visibility scoping:
    // Students and faculty only see their own submissions; admin sees all.
    if (currentUser.role !== 'admin') {
      entries = entries.filter(function (e) {
        var matchId = e.userId && String(e.userId) === String(currentUser.id);
        var matchName = e.person && e.person.toLowerCase() === currentUser.name.toLowerCase();
        return matchId || matchName;
      });
    }

    allScopedEntries = entries;

    populateFilterDropdowns(entries);
    applyFilters();

  } catch (err) {
    console.error('Failed to load reports data:', err);
    var errMsg = document.getElementById('error-message');
    if (errMsg) errMsg.textContent = err.message || 'Unable to retrieve report records';
    showReportsState('error');
  }
}

/**
 * Populates Year, Indicator, and Department filter dropdowns dynamically.
 */
function populateFilterDropdowns(entries) {
  var yearSelect = document.getElementById('filter-year');
  var indSelect = document.getElementById('filter-indicator');
  var deptSelect = document.getElementById('filter-department');

  // 1. Years
  var years = {};
  var indicators = {};
  var departments = {};

  entries.forEach(function (e) {
    if (e.year) years[e.year] = true;
    if (e.indicatorName) indicators[e.indicatorName] = true;
    if (e.department) departments[e.department] = true;
  });

  if (yearSelect) {
    var currentYear = yearSelect.value || 'all';
    var sortedYears = Object.keys(years).sort(function (a, b) { return Number(b) - Number(a); });
    yearSelect.innerHTML = '<option value="all">All Years</option>';
    sortedYears.forEach(function (yr) {
      yearSelect.innerHTML += '<option value="' + yr + '">' + yr + '</option>';
    });
    yearSelect.value = years[currentYear] ? currentYear : 'all';
  }

  if (indSelect) {
    var currentInd = indSelect.value || 'all';
    var sortedInds = Object.keys(indicators).sort();
    indSelect.innerHTML = '<option value="all">All Indicators</option>';
    sortedInds.forEach(function (ind) {
      indSelect.innerHTML += '<option value="' + escapeHtml(ind) + '">' + escapeHtml(ind) + '</option>';
    });
    indSelect.value = indicators[currentInd] ? currentInd : 'all';
  }

  if (deptSelect) {
    var currentDept = deptSelect.value || 'all';
    var sortedDepts = Object.keys(departments).sort();
    deptSelect.innerHTML = '<option value="all">All Departments</option>';
    sortedDepts.forEach(function (dept) {
      deptSelect.innerHTML += '<option value="' + escapeHtml(dept) + '">' + escapeHtml(dept) + '</option>';
    });
    deptSelect.value = departments[currentDept] ? currentDept : 'all';
  }
}

/**
 * Resets all filter dropdowns back to 'all'.
 */
function resetFilters() {
  var yearSelect = document.getElementById('filter-year');
  var statusSelect = document.getElementById('filter-status');
  var indSelect = document.getElementById('filter-indicator');
  var deptSelect = document.getElementById('filter-department');

  if (yearSelect) yearSelect.value = 'all';
  if (statusSelect) statusSelect.value = 'all';
  if (indSelect) indSelect.value = 'all';
  if (deptSelect) deptSelect.value = 'all';

  applyFilters();
}

/**
 * Applies active dropdown filters to scoped entries and updates the table.
 */
function applyFilters() {
  var yearVal = document.getElementById('filter-year') ? document.getElementById('filter-year').value : 'all';
  var statusVal = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'all';
  var indVal = document.getElementById('filter-indicator') ? document.getElementById('filter-indicator').value : 'all';
  var deptVal = document.getElementById('filter-department') ? document.getElementById('filter-department').value : 'all';

  filteredEntries = allScopedEntries.filter(function (e) {
    var matchYear = (yearVal === 'all') || (String(e.year) === String(yearVal));
    var matchStatus = (statusVal === 'all') || (e.status.toLowerCase() === statusVal.toLowerCase());
    var matchInd = (indVal === 'all') || (e.indicatorName === indVal);
    var matchDept = (deptVal === 'all') || (e.department === deptVal);
    return matchYear && matchStatus && matchInd && matchDept;
  });

  renderPreviewTable();
}

/**
 * Renders the preview table and updates the row count indicator.
 */
function renderPreviewTable() {
  var tbody = document.getElementById('reports-body');
  var countBadge = document.getElementById('report-row-count');

  if (countBadge) {
    countBadge.textContent = filteredEntries.length + (filteredEntries.length === 1 ? ' entry' : ' entries');
  }

  if (allScopedEntries.length === 0) {
    showReportsState('empty');
    return;
  }

  if (filteredEntries.length === 0) {
    showReportsState('ready');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px; color:#888;">No entries match the selected filters.</td></tr>';
    }
    return;
  }

  showReportsState('ready');
  if (!tbody) return;

  tbody.innerHTML = filteredEntries.map(function (e) {
    var badgeClass = 'badge-' + e.status;
    return '<tr>' +
      '<td class="title-cell">' +
        '<strong>' + escapeHtml(e.title) + '</strong>' +
        (e.description ? '<small>' + escapeHtml(e.description.slice(0, 75)) + (e.description.length > 75 ? '…' : '') + '</small>' : '') +
      '</td>' +
      '<td>' + escapeHtml(e.indicatorName) + '</td>' +
      '<td>' + escapeHtml(e.department) + '</td>' +
      '<td>' + escapeHtml(e.person) + '</td>' +
      '<td><span class="badge ' + badgeClass + '">' + escapeHtml(e.status) + '</span></td>' +
      '<td>' + escapeHtml(e.dateStr) + '</td>' +
    '</tr>';
  }).join('');
}

/**
 * Returns active filter summary string for reports.
 */
function getActiveFilterSummary() {
  var yearVal = document.getElementById('filter-year') ? document.getElementById('filter-year').value : 'all';
  var statusVal = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'all';
  var indVal = document.getElementById('filter-indicator') ? document.getElementById('filter-indicator').value : 'all';
  var deptVal = document.getElementById('filter-department') ? document.getElementById('filter-department').value : 'all';

  return 'Year: ' + yearVal + ' | Status: ' + statusVal.toUpperCase() + ' | Indicator: ' + indVal + ' | Dept: ' + deptVal;
}

/**
 * Escapes values for safe CSV cells according to RFC 4180.
 */
function escapeCsvCell(val) {
  var str = (val === null || val === undefined) ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Generates and triggers CSV download client-side.
 */
function exportCsv() {
  if (filteredEntries.length === 0) {
    alert('No entries available to export.');
    return;
  }

  var headers = ['Title', 'Indicator', 'Department', 'Person', 'Status', 'Date'];
  var rows = filteredEntries.map(function (e) {
    return [
      escapeCsvCell(e.title),
      escapeCsvCell(e.indicatorName),
      escapeCsvCell(e.department),
      escapeCsvCell(e.person),
      escapeCsvCell(e.status.toUpperCase()),
      escapeCsvCell(e.dateStr)
    ].join(',');
  });

  var csvContent = '\uFEFF' + headers.join(',') + '\r\n' + rows.join('\r\n');
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);

  var today = new Date().toISOString().slice(0, 10);
  var filename = 'innovation-report-' + today + '.csv';

  var link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers landscape A4 PDF report with table pagination and status summary.
 */
function exportPdf() {
  if (filteredEntries.length === 0) {
    alert('No entries available to export.');
    return;
  }

  var jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
  if (!jsPDFConstructor) {
    alert('jsPDF library is not loaded. Cannot export PDF.');
    return;
  }

  // A4 Landscape: 297mm x 210mm
  var doc = new jsPDFConstructor({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  var pageWidth = 297;
  var pageHeight = 210;
  var marginLeft = 14;
  var marginRight = 14;
  var contentWidth = pageWidth - marginLeft - marginRight; // 269mm
  var today = new Date().toISOString().slice(0, 10);

  // Column definitions (Total width = 269mm)
  var colWidths = {
    title: 75,
    indicator: 48,
    department: 46,
    person: 42,
    status: 26,
    date: 32
  };

  // Helper to draw the page header and table header
  function drawReportHeader(isFirstPage) {
    if (isFirstPage) {
      // Document Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text('Innovation Excellence Report', marginLeft, 18);

      // Metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Generated on: ' + today + ' • Innovation Portal Institutional Reporting', marginLeft, 24);
      doc.text('Filters: ' + getActiveFilterSummary(), marginLeft, 29);

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginLeft, 32, pageWidth - marginRight, 32);

      return 36;
    } else {
      // Running header for subsequent pages
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('Innovation Excellence Report (Continued) — ' + today, marginLeft, 12);
      return 16;
    }
  }

  // Helper to draw table column headers
  function drawTableHeaders(startY) {
    var hY = startY;
    var rowHeight = 8;

    // Header background fill
    doc.setFillColor(241, 245, 249);
    doc.rect(marginLeft, hY, contentWidth, rowHeight, 'F');

    // Header border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, hY, contentWidth, rowHeight, 'S');

    // Header text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    var curX = marginLeft;
    doc.text('TITLE', curX + 2, hY + 5.5);
    curX += colWidths.title;
    doc.text('INDICATOR', curX + 2, hY + 5.5);
    curX += colWidths.indicator;
    doc.text('DEPARTMENT', curX + 2, hY + 5.5);
    curX += colWidths.department;
    doc.text('CONTRIBUTOR', curX + 2, hY + 5.5);
    curX += colWidths.person;
    doc.text('STATUS', curX + 2, hY + 5.5);
    curX += colWidths.status;
    doc.text('DATE', curX + 2, hY + 5.5);

    return hY + rowHeight;
  }

  // Helper to draw running page numbers
  function addPageFooter(pageNum, totalPages) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    var footerText = 'Page ' + pageNum;
    doc.text(footerText, pageWidth - marginRight, pageHeight - 8, { align: 'right' });
  }

  var currentY = drawReportHeader(true);
  currentY = drawTableHeaders(currentY);

  var rowHeight = 8;
  var bottomLimit = 190;

  // Render Table Rows
  filteredEntries.forEach(function (e, index) {
    // Check if new page is needed
    if (currentY + rowHeight > bottomLimit) {
      doc.addPage();
      currentY = drawReportHeader(false);
      currentY = drawTableHeaders(currentY);
    }

    // Alternating row background
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginLeft, currentY, contentWidth, rowHeight, 'F');
    }

    // Row border line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, currentY + rowHeight, marginLeft + contentWidth, currentY + rowHeight);

    // Row content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    var curX = marginLeft;

    // Truncate strings to prevent cell overflows
    var titleText = (e.title.length > 40) ? e.title.slice(0, 38) + '…' : e.title;
    doc.text(titleText, curX + 2, currentY + 5.5);
    curX += colWidths.title;

    var indText = (e.indicatorName.length > 25) ? e.indicatorName.slice(0, 23) + '…' : e.indicatorName;
    doc.text(indText, curX + 2, currentY + 5.5);
    curX += colWidths.indicator;

    var deptText = (e.department.length > 24) ? e.department.slice(0, 22) + '…' : e.department;
    doc.text(deptText, curX + 2, currentY + 5.5);
    curX += colWidths.department;

    var personText = (e.person.length > 22) ? e.person.slice(0, 20) + '…' : e.person;
    doc.text(personText, curX + 2, currentY + 5.5);
    curX += colWidths.person;

    // Status text with color
    var statusUpper = e.status.toUpperCase();
    if (statusUpper === 'APPROVED') {
      doc.setTextColor(22, 163, 74); // Green
    } else if (statusUpper === 'REJECTED') {
      doc.setTextColor(220, 38, 38); // Red
    } else {
      doc.setTextColor(217, 119, 6); // Orange
    }
    doc.setFont('helvetica', 'bold');
    doc.text(statusUpper, curX + 2, currentY + 5.5);
    curX += colWidths.status;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(e.dateStr, curX + 2, currentY + 5.5);

    currentY += rowHeight;
  });

  // Calculate Summary Counts per Status
  var totalCount = filteredEntries.length;
  var approvedCount = 0;
  var pendingCount = 0;
  var rejectedCount = 0;

  filteredEntries.forEach(function (e) {
    if (e.status === 'approved') approvedCount++;
    else if (e.status === 'rejected') rejectedCount++;
    else pendingCount++;
  });

  // Summary Box at End of Report
  var summaryBoxHeight = 14;
  if (currentY + summaryBoxHeight > bottomLimit) {
    doc.addPage();
    currentY = drawReportHeader(false);
  }

  currentY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(marginLeft, currentY, contentWidth, summaryBoxHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('REPORT SUMMARY:', marginLeft + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  var summaryText = 'Total Entries: ' + totalCount +
    '    |    Approved: ' + approvedCount +
    '    |    Pending Review: ' + pendingCount +
    '    |    Rejected: ' + rejectedCount;
  doc.text(summaryText, marginLeft + 46, currentY + 9);

  // Add page numbers to all pages
  var totalPages = doc.internal.getNumberOfPages();
  for (var p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addPageFooter(p, totalPages);
  }

  // Save PDF
  var filename = 'innovation-report-' + today + '.pdf';
  doc.save(filename);
}

/**
 * Escapes HTML entities for UI rendering.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Controls display states: loading, empty, error, ready.
 */
function showReportsState(state) {
  var loadingEl = document.getElementById('reports-loading');
  var emptyEl = document.getElementById('reports-empty');
  var errorEl = document.getElementById('reports-error');
  var contentEl = document.getElementById('reports-content');

  if (loadingEl) loadingEl.style.display = (state === 'loading') ? 'block' : 'none';
  if (emptyEl) emptyEl.style.display = (state === 'empty') ? 'block' : 'none';
  if (errorEl) errorEl.style.display = (state === 'error') ? 'block' : 'none';
  if (contentEl) contentEl.style.display = (state === 'ready') ? 'block' : 'none';
}
