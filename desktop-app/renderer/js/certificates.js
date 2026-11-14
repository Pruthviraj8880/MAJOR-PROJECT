// ============================================================
// certificates.js — Certificate Generation and Export
// Follows vanilla JS style. Consumes apiRequest() and requireAuth().
// Uses jsPDF UMD build to generate landscape A4 certificates.
// ============================================================

var currentUser = null;
var allApprovedEntries = [];
var displayedEntries = [];

/**
 * Normalizes an entry from either mock server or backend payload.
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
  var dateFormatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    id: raw.id,
    title: raw.title || 'Untitled',
    description: raw.description || '',
    status: normalizedStatus,
    indicatorId: indicatorId,
    indicatorName: indicatorName,
    userId: userId,
    person: person,
    department: department,
    date: date,
    dateFormatted: dateFormatted,
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
 * Main initializer for Certificates page.
 */
async function initCertificates() {
  currentUser = requireAuth();
  if (!currentUser) return;

  var userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.textContent = currentUser.name + ' (' + currentUser.role + ')';
  }

  var bannerEl = document.getElementById('role-info-banner');
  if (bannerEl) {
    if (currentUser.role === 'admin') {
      bannerEl.innerHTML = '🛡️ <strong>Admin Access:</strong> Displaying all verified institutional certificates.';
    } else {
      bannerEl.innerHTML = '👤 <strong>Personal Portfolio:</strong> Displaying your verified innovation certificates.';
    }
  }

  showCertificatesState('loading');

  try {
    var results = await Promise.all([
      loadIndicatorDepartmentMap(),
      fetchAllEntries()
    ]);

    var indicatorDeptMap = results[0];
    var allEntries = results[1] || [];

    // Normalize and filter ONLY approved entries
    var approved = allEntries
      .map(function (raw) { return normalizeEntry(raw, indicatorDeptMap); })
      .filter(function (e) { return e && e.status === 'approved'; });

    // Role-based visibility check:
    // If student or faculty, show only their own entries; admin sees all.
    if (currentUser.role !== 'admin') {
      approved = approved.filter(function (e) {
        var matchId = e.userId && String(e.userId) === String(currentUser.id);
        var matchName = e.person && e.person.toLowerCase() === currentUser.name.toLowerCase();
        return matchId || matchName;
      });
    }

    allApprovedEntries = approved;
    displayedEntries = approved;

    renderCertificatesTable();

  } catch (err) {
    console.error('Failed to load certificates data:', err);
    var errMsg = document.getElementById('error-message');
    if (errMsg) errMsg.textContent = err.message || 'Unable to retrieve certificate records';
    showCertificatesState('error');
  }
}

/**
 * Filters displayed entries by title or person name.
 */
function handleCertificateSearch() {
  var searchInput = document.getElementById('search-keyword');
  var query = (searchInput ? searchInput.value : '').toLowerCase().trim();

  if (!query) {
    displayedEntries = allApprovedEntries;
  } else {
    displayedEntries = allApprovedEntries.filter(function (e) {
      var matchTitle = e.title && e.title.toLowerCase().includes(query);
      var matchPerson = e.person && e.person.toLowerCase().includes(query);
      var matchIndicator = e.indicatorName && e.indicatorName.toLowerCase().includes(query);
      return matchTitle || matchPerson || matchIndicator;
    });
  }

  renderCertificatesTable();
}

/**
 * Renders the table of approved entries eligible for certificates.
 */
function renderCertificatesTable() {
  var tbody = document.getElementById('certificates-body');
  if (!tbody) return;

  if (allApprovedEntries.length === 0) {
    showCertificatesState('empty');
    return;
  }

  if (displayedEntries.length === 0) {
    showCertificatesState('ready');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#888;">No matching certificates found for your search.</td></tr>';
    return;
  }

  showCertificatesState('ready');
  tbody.innerHTML = displayedEntries.map(function (entry) {
    return '<tr>' +
      '<td class="entry-title-cell">' +
        '<strong>' + escapeHtml(entry.title) + '</strong>' +
        (entry.description ? '<small>' + escapeHtml(entry.description.slice(0, 80)) + (entry.description.length > 80 ? '…' : '') + '</small>' : '') +
      '</td>' +
      '<td>' + escapeHtml(entry.indicatorName) + '</td>' +
      '<td>' + escapeHtml(entry.person) + '</td>' +
      '<td>' + escapeHtml(entry.dateFormatted) + '</td>' +
      '<td style="text-align:right;">' +
        '<button class="btn-cert" onclick="downloadCertificateById(\'' + entry.id + '\')">' +
          '📜 Download Certificate' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

/**
 * Finds entry by ID and initiates PDF download.
 */
function downloadCertificateById(id) {
  var entry = allApprovedEntries.find(function (e) {
    return String(e.id) === String(id);
  });
  if (!entry) {
    alert('Entry record not found.');
    return;
  }
  generateCertificatePdf(entry);
}

/**
 * Sanitizes strings for safe filename construction.
 */
function sanitizeFilenamePart(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generates an elegant landscape A4 Certificate of Achievement PDF using jsPDF.
 */
function generateCertificatePdf(entry) {
  var jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
  if (!jsPDFConstructor) {
    alert('PDF generation library is not loaded. Please verify jsPDF.');
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

  // 1. Decorative Borders
  // Outer Border (Navy Blue #1e3a8a)
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Inner Border (Gold #d97706)
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // Corner Accent Diamonds
  var corners = [
    [14, 14],
    [pageWidth - 14, 14],
    [14, pageHeight - 14],
    [pageWidth - 14, pageHeight - 14]
  ];
  doc.setFillColor(217, 119, 6);
  corners.forEach(function (pt) {
    doc.circle(pt[0], pt[1], 1.5, 'FD');
  });

  // 2. Institute Name & Top Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235); // Primary Blue
  doc.text('INNOVATION PORTAL', pageWidth / 2, 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Institutional Excellence & Accreditation Reporting Cell', pageWidth / 2, 36, { align: 'center' });

  // 3. Main Certificate Heading
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text('Certificate of Achievement', pageWidth / 2, 52, { align: 'center' });

  // Decorative divider below heading
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 45, 57, pageWidth / 2 + 45, 57);

  // 4. Presentation Text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('This is proudly presented to', pageWidth / 2, 68, { align: 'center' });

  // 5. Recipient Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(entry.person, pageWidth / 2, 82, { align: 'center' });

  // Underline beneath person name
  var nameWidth = doc.getTextWidth(entry.person);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - (nameWidth / 2) - 5, 85, pageWidth / 2 + (nameWidth / 2) + 5, 85);

  // 6. Achievement Details Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('in recognition of their validated innovation achievement and outstanding contribution for:', pageWidth / 2, 98, { align: 'center' });

  // 7. Entry Title (with multi-line wrap protection)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(29, 78, 216); // Royal Blue
  var titleLines = doc.splitTextToSize('"' + entry.title + '"', 200);
  doc.text(titleLines, pageWidth / 2, 110, { align: 'center' });

  var nextY = 110 + (titleLines.length * 7);

  // 8. Indicator Name & Category
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('Indicator Category: ' + entry.indicatorName + (entry.department !== 'Unknown' ? ' • ' + entry.department : ''), pageWidth / 2, nextY + 4, { align: 'center' });

  // 9. Verification Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 163, 74); // Success green
  doc.text('★ VERIFIED INSTITUTIONAL RECORD ★', pageWidth / 2, nextY + 16, { align: 'center' });

  // 10. Footer Section: Date & Signature Line
  var footerY = 175;

  // Approval Date (Left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text('Approval Date: ' + entry.dateFormatted, 28, footerY);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Record ID: #' + entry.id, 28, footerY + 5);

  // Signature Line (Right)
  var sigX = pageWidth - 80;
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.4);
  doc.line(sigX, footerY - 2, sigX + 52, footerY - 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('Authorized Signatory', sigX + 26, footerY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Innovation Excellence Cell', sigX + 26, footerY + 8, { align: 'center' });

  // 11. Save PDF
  var fileName = 'certificate-' + sanitizeFilenamePart(entry.person) + '-' + sanitizeFilenamePart(entry.title) + '.pdf';
  doc.save(fileName);
}

/**
 * Escapes HTML entities to prevent script injection.
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
function showCertificatesState(state) {
  var loadingEl = document.getElementById('certificates-loading');
  var emptyEl = document.getElementById('certificates-empty');
  var errorEl = document.getElementById('certificates-error');
  var contentEl = document.getElementById('certificates-content');

  if (loadingEl) loadingEl.style.display = (state === 'loading') ? 'block' : 'none';
  if (emptyEl) emptyEl.style.display = (state === 'empty') ? 'block' : 'none';
  if (errorEl) errorEl.style.display = (state === 'error') ? 'block' : 'none';
  if (contentEl) contentEl.style.display = (state === 'ready') ? 'block' : 'none';
}
