// ============================================================
// js/csvImport.js — Bulk CSV import using PapaParse.
// Validates rows, renders 10-row preview, imports valid entries.
// ============================================================

var parsedCsvRows = [];
var cachedCsvIndicators = [];

// Download a sample CSV so users know the expected format
function downloadSampleCsv() {
  var csv = 'indicator,title,description,date,value\n' +
    'Research Papers,Deep Learning for Medical Diagnosis,Published in IEEE Access,2026-10-15,1\n' +
    'Patents Filed,IoT Solar Tracking System,Filed with Indian Patent Office,2026-10-22,1\n' +
    'Grants Received,DST-SERB AI Research Grant,Funded by Dept of Science & Tech,2026-11-01,500000\n' +
    'Startups Incubated,EduTech Platform,Incubated at Innovation Cell,2026-11-05,1\n' +
    'National Awards,Smart India Hackathon Prize,Won nationwide competition,2026-11-10,1';
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'sample_innovation_entries.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Ensure indicators are cached before validating rows
function ensureIndicatorsLoaded() {
  if (cachedCsvIndicators.length > 0) return Promise.resolve(cachedCsvIndicators);
  return getIndicators().then(function (l) { cachedCsvIndicators = l || []; return cachedCsvIndicators; })
    .catch(function () { cachedCsvIndicators = []; return []; });
}

// File picker handler — parse the selected CSV on the client
function handleCsvFileSelect(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;
  ensureIndicatorsLoaded().then(function () {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: function (r) {
        if (!r.data || r.data.length === 0) return showToast('CSV file is empty', 'error');
        processParsedCsvRows(r.data);
      },
      error: function (e) { showToast('CSV parse error: ' + e.message, 'error'); }
    });
  });
}

// Validate each row: indicator exists, date YYYY-MM-DD, value > 0
function processParsedCsvRows(rawRows) {
  parsedCsvRows = [];
  rawRows.forEach(function (row) {
    var ind = (row.indicator || row.indicatorName || row.indicatorId || '').trim();
    var title = (row.title || '').trim();
    var desc = (row.description || '').trim();
    var dateStr = (row.date || '').trim();
    var valStr = (row.value || '').trim();
    var errs = [];

    if (!title) errs.push('Title empty');
    var match = cachedCsvIndicators.find(function (i) {
      return i.name.toLowerCase() === ind.toLowerCase() || String(i.id) === ind;
    });
    if (!ind) errs.push('Indicator missing');
    else if (!match) errs.push('Unknown indicator');

    var dateOk = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
    if (!dateStr) errs.push('Date missing');
    else if (!dateOk) errs.push('Bad date');

    var num = Number(valStr);
    if (!valStr) errs.push('Value missing');
    else if (isNaN(num) || num <= 0) errs.push('Value not a positive number');

    parsedCsvRows.push({
      indicatorId: match ? match.id : null, indicatorName: match ? match.name : ind,
      title: title, description: desc, date: dateStr, value: num,
      valid: errs.length === 0, errors: errs
    });
  });
  renderCsvPreview();
}

// Show first 10 rows; invalid rows in red with error reason
function renderCsvPreview() {
  var tbody = document.getElementById('preview-body');
  var btn = document.getElementById('btn-execute-import');
  var countEl = document.getElementById('parsed-count');
  if (!tbody) return;

  var validN = parsedCsvRows.filter(function (r) { return r.valid; }).length;
  var invalidN = parsedCsvRows.length - validN;
  if (countEl) countEl.textContent = parsedCsvRows.length + ' rows (' + validN + ' valid, ' + invalidN + ' invalid)';

  if (parsedCsvRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:#888;">No rows found.</td></tr>';
    if (btn) btn.disabled = true; return;
  }
  if (btn) btn.disabled = validN === 0;

  var noteEl = document.getElementById('csv-preview-note');
  if (noteEl) noteEl.textContent = parsedCsvRows.length > 10 ? 'Showing 10 of ' + parsedCsvRows.length + ' rows.' : '';

  var esc = function (s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  tbody.innerHTML = parsedCsvRows.slice(0, 10).map(function (r, i) {
    var badge = r.valid ? '<span class="badge-valid">✓ Valid</span>' : '<span class="badge-invalid">✕ ' + r.errors.join('; ') + '</span>';
    return '<tr class="' + (r.valid ? '' : 'row-invalid') + '">' +
      '<td>' + (i+1) + '</td><td>' + esc(r.title||'—') + '</td><td>' + esc(r.indicatorName||'—') +
      '</td><td>' + esc(r.date||'—') + '</td><td>' + (r.valid ? r.value : esc(r.value||'—')) +
      '</td><td>' + badge + '</td></tr>';
  }).join('');
}

// Import valid rows one-by-one via POST /api/entries, show summary
async function executeCsvImport() {
  var btn = document.getElementById('btn-execute-import');
  if (btn) { btn.disabled = true; btn.textContent = 'Importing…'; }

  var valid = parsedCsvRows.filter(function (r) { return r.valid; });
  var skipped = parsedCsvRows.length - valid.length;
  var imported = 0, failed = 0;

  for (var i = 0; i < valid.length; i++) {
    try {
      await createEntry({ indicatorId: valid[i].indicatorId, title: valid[i].title,
        description: valid[i].description, date: valid[i].date, value: valid[i].value });
      imported++;
    } catch (e) { failed++; }
    if (btn) btn.textContent = 'Importing… (' + (i+1) + '/' + valid.length + ')';
  }

  var msg = imported + ' imported, ' + skipped + ' skipped' + (failed ? ', ' + failed + ' failed' : '');
  showToast(msg, imported > 0 ? 'success' : 'error');

  // Show summary banner
  var el = document.getElementById('csv-import-summary');
  if (el) {
    el.className = 'import-summary-banner import-summary-success';
    el.style.display = 'flex';
    el.innerHTML = '<span>✅ ' + msg + '</span><button class="btn btn-outline" style="padding:4px 10px;font-size:12px;" onclick="this.parentElement.style.display=\'none\'">Dismiss</button>';
  }

  if (btn) { btn.textContent = 'Import All Entries'; btn.disabled = true; }
  parsedCsvRows = [];
  var fi = document.getElementById('dashboard-csv-input');
  if (fi) fi.value = '';
}
