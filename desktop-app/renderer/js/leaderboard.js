// ============================================================
// leaderboard.js — Innovation Excellence Leaderboard
// Follows vanilla JS style. Consumes apiRequest() and requireAuth().
// ============================================================

var currentTab = 'individuals'; // 'individuals' | 'departments'
var rawApprovedEntries = [];
var indicatorDeptMap = {};

/**
 * Normalizes an entry from either the mock server or real backend.
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

  return {
    id: raw.id,
    title: raw.title || 'Untitled',
    status: normalizedStatus,
    indicatorName: indicatorName,
    person: person,
    department: department,
    year: year,
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
 * Main initializer for Leaderboard.
 */
async function initLeaderboard() {
  var user = requireAuth();
  if (!user) return;

  var userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.textContent = user.name + ' (' + user.role + ')';
  }

  showLeaderboardState('loading');

  try {
    var results = await Promise.all([
      loadIndicatorDepartmentMap(),
      fetchAllEntries()
    ]);

    indicatorDeptMap = results[0];
    var allEntries = results[1] || [];

    // Normalize and filter ONLY approved entries
    rawApprovedEntries = allEntries
      .map(function (raw) { return normalizeEntry(raw, indicatorDeptMap); })
      .filter(function (e) { return e && e.status === 'approved'; });

    populateYearFilter(rawApprovedEntries);
    renderLeaderboard();

  } catch (err) {
    console.error('Failed to load leaderboard data:', err);
    var errMsg = document.getElementById('error-message');
    if (errMsg) errMsg.textContent = err.message || 'Unable to load leaderboard data';
    showLeaderboardState('error');
  }
}

/**
 * Populates year filter dropdown based on available approved entries.
 */
function populateYearFilter(entries) {
  var select = document.getElementById('filter-year');
  if (!select) return;

  var currentSelected = select.value || 'all';

  var years = {};
  entries.forEach(function (e) {
    if (e.year) years[e.year] = true;
  });

  var sortedYears = Object.keys(years).sort(function (a, b) {
    return Number(b) - Number(a);
  });

  select.innerHTML = '<option value="all">All Years</option>';
  sortedYears.forEach(function (yr) {
    var opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    select.appendChild(opt);
  });

  if (years[currentSelected] || currentSelected === 'all') {
    select.value = currentSelected;
  } else {
    select.value = 'all';
  }
}

/**
 * Tab switcher handler.
 */
function switchTab(tab) {
  currentTab = tab;
  var btnInd = document.getElementById('tab-btn-individuals');
  var btnDept = document.getElementById('tab-btn-departments');

  if (btnInd && btnDept) {
    btnInd.classList.toggle('active', tab === 'individuals');
    btnDept.classList.toggle('active', tab === 'departments');
  }

  var colNameLabel = document.getElementById('col-header-name');
  if (colNameLabel) {
    colNameLabel.textContent = (tab === 'individuals') ? 'Individual Contributor' : 'Department';
  }

  renderLeaderboard();
}

/**
 * Renders the leaderboard rows for the active tab and year filter.
 */
function renderLeaderboard() {
  var yearFilter = document.getElementById('filter-year') ? document.getElementById('filter-year').value : 'all';

  var filtered = rawApprovedEntries.filter(function (e) {
    return (yearFilter === 'all') || (String(e.year) === String(yearFilter));
  });

  if (filtered.length === 0) {
    showLeaderboardState('empty');
    return;
  }

  showLeaderboardState('ready');

  var listContainer = document.getElementById('leaderboard-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (currentTab === 'individuals') {
    renderIndividualsLeaderboard(filtered, listContainer);
  } else {
    renderDepartmentsLeaderboard(filtered, listContainer);
  }
}

/**
 * Renders Top Individuals rankings.
 */
function renderIndividualsLeaderboard(entries, container) {
  var scores = {};
  entries.forEach(function (e) {
    var name = e.person || 'Unknown';
    if (!scores[name]) {
      scores[name] = {
        name: name,
        department: e.department || 'Unknown',
        score: 0
      };
    }
    scores[name].score++;
    if (scores[name].department === 'Unknown' && e.department && e.department !== 'Unknown') {
      scores[name].department = e.department;
    }
  });

  var ranked = Object.keys(scores).map(function (k) {
    return scores[k];
  }).sort(function (a, b) {
    return b.score - a.score || a.name.localeCompare(b.name);
  });

  var maxScore = ranked[0] ? ranked[0].score : 1;

  ranked.forEach(function (item, idx) {
    var rank = idx + 1;
    var row = createLeaderboardRow(rank, item.name, item.department, item.score, maxScore);
    container.appendChild(row);
  });
}

/**
 * Renders Top Departments rankings.
 */
function renderDepartmentsLeaderboard(entries, container) {
  var deptScores = {};
  entries.forEach(function (e) {
    var dept = e.department || 'Unknown';
    if (!deptScores[dept]) {
      deptScores[dept] = {
        name: dept,
        score: 0,
        contributors: {}
      };
    }
    deptScores[dept].score++;
    if (e.person) {
      deptScores[dept].contributors[e.person] = true;
    }
  });

  var ranked = Object.keys(deptScores).map(function (k) {
    return {
      name: k,
      score: deptScores[k].score,
      contributorCount: Object.keys(deptScores[k].contributors).length
    };
  }).sort(function (a, b) {
    return b.score - a.score || a.name.localeCompare(b.name);
  });

  var maxScore = ranked[0] ? ranked[0].score : 1;

  ranked.forEach(function (item, idx) {
    var rank = idx + 1;
    var subtitle = item.contributorCount + (item.contributorCount === 1 ? ' contributor' : ' contributors');
    var row = createLeaderboardRow(rank, item.name, subtitle, item.score, maxScore);
    container.appendChild(row);
  });
}

/**
 * Creates a DOM row for a leaderboard rank entry with podium highlights.
 */
function createLeaderboardRow(rank, title, subtitle, score, maxScore) {
  var row = document.createElement('div');
  row.className = 'leaderboard-row';

  var rankBadgeHtml = '#' + rank;
  var topBadgeHtml = '';

  if (rank === 1) {
    row.classList.add('row-rank-1');
    rankBadgeHtml = '🥇';
    topBadgeHtml = '<span class="top-badge badge-gold">1st Place</span>';
  } else if (rank === 2) {
    row.classList.add('row-rank-2');
    rankBadgeHtml = '🥈';
    topBadgeHtml = '<span class="top-badge badge-silver">2nd Place</span>';
  } else if (rank === 3) {
    row.classList.add('row-rank-3');
    rankBadgeHtml = '🥉';
    topBadgeHtml = '<span class="top-badge badge-bronze">3rd Place</span>';
  }

  var percent = Math.min(100, Math.max(8, Math.round((score / maxScore) * 100)));

  row.innerHTML =
    '<div class="col-rank">' +
      '<span class="rank-badge">' + rankBadgeHtml + '</span>' +
    '</div>' +
    '<div class="col-name">' +
      '<div class="entry-main-name">' +
        escapeHtml(title) +
        topBadgeHtml +
      '</div>' +
      (subtitle ? '<div class="entry-sub-name">' + escapeHtml(subtitle) + '</div>' : '') +
    '</div>' +
    '<div class="col-progress">' +
      '<div class="score-bar-track">' +
        '<div class="score-bar-fill" style="width:' + percent + '%;"></div>' +
      '</div>' +
    '</div>' +
    '<div class="col-score">' +
      '<div class="score-value">' + score + '</div>' +
      '<div class="score-unit">approved</div>' +
    '</div>';

  return row;
}

/**
 * Escapes HTML entities to avoid injection.
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
function showLeaderboardState(state) {
  var loadingEl = document.getElementById('leaderboard-loading');
  var emptyEl = document.getElementById('leaderboard-empty');
  var errorEl = document.getElementById('leaderboard-error');
  var contentEl = document.getElementById('leaderboard-content');

  if (loadingEl) loadingEl.style.display = (state === 'loading') ? 'block' : 'none';
  if (emptyEl) emptyEl.style.display = (state === 'empty') ? 'block' : 'none';
  if (errorEl) errorEl.style.display = (state === 'error') ? 'block' : 'none';
  if (contentEl) contentEl.style.display = (state === 'ready') ? 'block' : 'none';
}
