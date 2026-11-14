// ============================================================
// analytics.js — Innovation Portal Analytics & Charts
// Follows vanilla JS style. Consumes apiRequest() and requireAuth().
// ============================================================

var chartInstances = {
  year: null,
  dept: null,
  status: null,
  trend: null
};

/**
 * Normalizes an entry from either the mock server or real backend.
 * Handles both flat and nested schemas, standardizing the status,
 * person, indicator, department, and timestamps.
 */
function normalizeEntry(raw, indicatorDeptMap) {
  if (!raw) return null;
  indicatorDeptMap = indicatorDeptMap || {};

  // Status lowercasing & mapping
  var rawStatus = (raw.status || '').toString().toLowerCase().trim();
  var normalizedStatus = rawStatus;
  if (rawStatus === 'submitted' || rawStatus === 'draft') {
    normalizedStatus = 'pending';
  }

  // Indicator Name
  var indicatorName = raw.indicatorName ||
    (raw.indicator && raw.indicator.name) ||
    'Unknown Indicator';

  // Indicator ID
  var indicatorId = raw.indicatorId ||
    (raw.indicator && raw.indicator.id) ||
    null;

  // Person (submittedByName or createdBy.name)
  var person = raw.submittedByName ||
    (raw.createdBy && raw.createdBy.name) ||
    (raw.submittedBy ? 'User #' + raw.submittedBy : 'Unknown');

  // Department: from indicator map, nested indicator object, or raw field
  var department = 'Unknown';
  if (indicatorId && indicatorDeptMap[indicatorId]) {
    department = indicatorDeptMap[indicatorId];
  } else if (raw.indicator && raw.indicator.department && raw.indicator.department.name) {
    department = raw.indicator.department.name;
  } else if (raw.departmentName) {
    department = raw.departmentName;
  }

  // Date parsing: Year and Month
  var date = raw.createdAt ? new Date(raw.createdAt) : new Date();
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  var year = date.getFullYear();
  var month = date.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec

  return {
    id: raw.id,
    title: raw.title || 'Untitled',
    description: raw.description || '',
    status: normalizedStatus, // 'pending', 'approved', 'rejected'
    rawStatus: rawStatus,
    indicatorId: indicatorId,
    indicatorName: indicatorName,
    person: person,
    department: department,
    date: date,
    year: year,
    month: month,
    createdAt: raw.createdAt
  };
}

/**
 * Builds a map of indicatorId -> department name from GET /api/indicators.
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
 * Fetches all entries, handling both plain arrays (mock server)
 * and paginated responses { entries, pagination } (real backend).
 */
async function fetchAllEntries() {
  var firstRes = await apiRequest('/api/entries?page=1&limit=100');

  // 1. Plain array (mock server format)
  if (Array.isArray(firstRes)) {
    return firstRes;
  }

  // 2. Paginated object { entries, pagination } (backend format)
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
 * Generates an array of the last 12 rolling months for chronological trend analysis.
 */
function getLast12MonthsBuckets() {
  var months = [];
  var now = new Date();
  var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (var i = 11; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var y = d.getFullYear();
    var m = d.getMonth();
    var key = y + '-' + (m < 9 ? '0' : '') + (m + 1);
    var label = monthNames[m] + ' ' + y;
    months.push({ key: key, label: label, count: 0 });
  }
  return months;
}

/**
 * Destroys existing Chart.js instances to avoid canvas reuse conflicts.
 */
function destroyCharts() {
  ['year', 'dept', 'status', 'trend'].forEach(function (key) {
    if (chartInstances[key]) {
      chartInstances[key].destroy();
      chartInstances[key] = null;
    }
  });
}

/**
 * Main analytics initializer.
 */
async function initAnalytics() {
  // Check auth
  var user = requireAuth();
  if (!user) return;

  var userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.textContent = user.name + ' (' + user.role + ')';
  }

  // Set loading state
  showAnalyticsState('loading');

  try {
    // 1. Load indicator department mapping and all entries concurrently
    var results = await Promise.all([
      loadIndicatorDepartmentMap(),
      fetchAllEntries()
    ]);

    var indicatorDeptMap = results[0];
    var rawEntries = results[1];

    if (!rawEntries || rawEntries.length === 0) {
      showAnalyticsState('empty');
      return;
    }

    // 2. Normalize all entries
    var entries = rawEntries.map(function (raw) {
      return normalizeEntry(raw, indicatorDeptMap);
    }).filter(Boolean);

    // 3. Render metrics and charts
    showAnalyticsState('ready');
    renderSummaryCards(entries);
    renderCharts(entries);

  } catch (err) {
    console.error('Analytics load error:', err);
    var errMsg = document.getElementById('error-message');
    if (errMsg) errMsg.textContent = err.message || 'Unable to load analytics data';
    showAnalyticsState('error');
  }
}

/**
 * Toggles between loading, empty, error, and ready views.
 */
function showAnalyticsState(state) {
  var loadingEl = document.getElementById('analytics-loading');
  var emptyEl = document.getElementById('analytics-empty');
  var errorEl = document.getElementById('analytics-error');
  var contentEl = document.getElementById('analytics-content');

  if (loadingEl) loadingEl.style.display = (state === 'loading') ? 'block' : 'none';
  if (emptyEl) emptyEl.style.display = (state === 'empty') ? 'block' : 'none';
  if (errorEl) errorEl.style.display = (state === 'error') ? 'block' : 'none';
  if (contentEl) contentEl.style.display = (state === 'ready') ? 'block' : 'none';
}

/**
 * Updates the 4 summary metric cards.
 */
function renderSummaryCards(entries) {
  var total = entries.length;
  var approved = 0;
  var pending = 0;
  var rejected = 0;

  entries.forEach(function (e) {
    if (e.status === 'approved') {
      approved++;
    } else if (e.status === 'rejected') {
      rejected++;
    } else {
      pending++;
    }
  });

  setText('val-total', total);
  setText('val-approved', approved);
  setText('val-pending', pending);
  setText('val-rejected', rejected);
}

/**
 * Renders all 4 Chart.js charts.
 */
function renderCharts(entries) {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js library is not loaded');
    return;
  }

  destroyCharts();

  // --- 1. Entries per Year ---
  var yearCounts = {};
  entries.forEach(function (e) {
    var yr = e.year || 'Unknown';
    yearCounts[yr] = (yearCounts[yr] || 0) + 1;
  });

  var sortedYears = Object.keys(yearCounts).sort(function (a, b) {
    return Number(a) - Number(b);
  });
  var yearData = sortedYears.map(function (yr) { return yearCounts[yr]; });

  var ctxYear = document.getElementById('chart-year').getContext('2d');
  chartInstances.year = new Chart(ctxYear, {
    type: 'bar',
    data: {
      labels: sortedYears,
      datasets: [{
        label: 'Entries',
        data: yearData,
        backgroundColor: '#2563eb',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });

  // --- 2. Entries per Department ---
  var deptCounts = {};
  entries.forEach(function (e) {
    var dept = e.department || 'Unknown';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });

  var deptLabels = Object.keys(deptCounts);
  var deptData = deptLabels.map(function (d) { return deptCounts[d]; });

  var deptColors = [
    '#2563eb', '#16a34a', '#d97706', '#9333ea',
    '#0891b2', '#ea580c', '#4f46e5', '#64748b'
  ];

  var ctxDept = document.getElementById('chart-dept').getContext('2d');
  chartInstances.dept = new Chart(ctxDept, {
    type: 'bar',
    data: {
      labels: deptLabels,
      datasets: [{
        label: 'Entries',
        data: deptData,
        backgroundColor: deptColors.slice(0, deptLabels.length),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });

  // --- 3. Entries by Status ---
  var statusCounts = { approved: 0, pending: 0, rejected: 0 };
  entries.forEach(function (e) {
    if (e.status === 'approved') statusCounts.approved++;
    else if (e.status === 'rejected') statusCounts.rejected++;
    else statusCounts.pending++;
  });

  var ctxStatus = document.getElementById('chart-status').getContext('2d');
  chartInstances.status = new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: ['Approved', 'Pending', 'Rejected'],
      datasets: [{
        data: [statusCounts.approved, statusCounts.pending, statusCounts.rejected],
        backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 16 }
        }
      },
      cutout: '65%'
    }
  });

  // --- 4. Monthly Trend (Last 12 Months) ---
  var monthBuckets = getLast12MonthsBuckets();
  entries.forEach(function (e) {
    var key = e.year + '-' + (e.month < 9 ? '0' : '') + (e.month + 1);
    var found = monthBuckets.find(function (b) { return b.key === key; });
    if (found) {
      found.count++;
    }
  });

  var trendLabels = monthBuckets.map(function (b) { return b.label; });
  var trendData = monthBuckets.map(function (b) { return b.count; });

  var ctxTrend = document.getElementById('chart-trend').getContext('2d');
  chartInstances.trend = new Chart(ctxTrend, {
    type: 'line',
    data: {
      labels: trendLabels,
      datasets: [{
        label: 'Entries Submitted',
        data: trendData,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

