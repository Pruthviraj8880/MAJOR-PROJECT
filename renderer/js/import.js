// ============================================================
// import.js — Bulk CSV import of achievement entries using PapaParse.
// Accessible to faculty and admin.
// ============================================================

var parsedRows = [];
var indicatorList = [];

function initImportPage() {
  var user = requireAuth();
  if (!user) return;

  if (user.role === 'student') {
    alert('Access denied: Faculty and Admin only');
    window.location.href = 'dashboard.html';
    return;
  }

  setText('user-info', user.name + ' (' + user.role + ')');
  buildNav(user.role);

  // Load indicators so we can resolve indicator names/IDs in CSV
  getIndicators()
    .then(function (data) {
      indicatorList = data;
    })
    .catch(function (err) {
      showToast('Could not fetch indicators list', 'error');
    });
}

// Triggered when user selects a CSV file
function handleFileSelect(event) {
  var file = event.target.files[0];
  if (!file) return;

  // Use PapaParse to parse the CSV file in the browser
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      processCsvData(results.data);
    },
    error: function (err) {
      showToast('Failed to read CSV: ' + err.message, 'error');
    }
  });
}

// Validate each row and prepare preview
function processCsvData(rows) {
  parsedRows = [];

  rows.forEach(function (row) {
    // Look for flexible column names: indicatorId or indicator
    var indVal = (row.indicatorId || row.indicator || row.indicatorName || '').trim();
    var title = (row.title || '').trim();
    var description = (row.description || '').trim();

    if (!title) return; // Skip empty titles

    // Match indicator either by numeric ID or by name
    var matchedInd = indicatorList.find(function (i) {
      return String(i.id) === indVal || i.name.toLowerCase() === indVal.toLowerCase();
    });

    parsedRows.push({
      indicatorId: matchedInd ? matchedInd.id : Number(indVal) || null,
      indicatorName: matchedInd ? matchedInd.name : indVal,
      title: title,
      description: description,
      valid: !!matchedInd || !isNaN(Number(indVal))
    });
  });

  renderPreview();
}

// Render parsed rows into the preview table
function renderPreview() {
  var tbody = document.getElementById('preview-body');
  var importBtn = document.getElementById('btn-execute-import');
  var countBadge = document.getElementById('parsed-count');

  countBadge.textContent = parsedRows.length + ' rows found';

  if (parsedRows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:#999;">No valid rows found in CSV.</td></tr>';
    importBtn.disabled = true;
    return;
  }

  importBtn.disabled = false;
  tbody.innerHTML = parsedRows.map(function (row, idx) {
    var statusText = row.valid ? '<span class="badge badge-approved">Valid</span>' : '<span class="badge badge-rejected">Unknown Indicator</span>';
    return '<tr>' +
      '<td>' + (idx + 1) + '</td>' +
      '<td><strong>' + row.title + '</strong><br><small style="color:#666;">' + row.description + '</small></td>' +
      '<td>' + row.indicatorName + '</td>' +
      '<td>' + statusText + '</td>' +
      '</tr>';
  }).join('');
}

// Loop and send each entry to POST /api/entries
async function executeImport() {
  var importBtn = document.getElementById('btn-execute-import');
  importBtn.disabled = true;
  importBtn.textContent = 'Importing…';

  var successCount = 0;
  var failCount = 0;

  for (var i = 0; i < parsedRows.length; i++) {
    var row = parsedRows[i];
    try {
      await createEntry({
        indicatorId: row.indicatorId,
        title: row.title,
        description: row.description
      });
      successCount++;
    } catch (e) {
      failCount++;
    }
  }

  showToast('Imported ' + successCount + ' entries! (' + failCount + ' failed)', successCount > 0 ? 'success' : 'error');

  // Reset
  document.getElementById('csv-file-input').value = '';
  parsedRows = [];
  renderPreview();
  importBtn.textContent = 'Import All Entries';
}

// Download a sample CSV template for users to fill
function downloadTemplate() {
  var csvContent = "data:text/csv;charset=utf-8,title,indicator,description\n" +
    '"AI Image Analysis Paper","Research Papers","Published in IEEE Journal"\n' +
    '"Smart Grid Patent","Patents Filed","Filed with Indian Patent Office"\n' +
    '"Biotech Startup Incubation","Startups Incubated","Student-led initiative"';

  var encodedUri = encodeURI(csvContent);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'sample_innovation_entries.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
}

