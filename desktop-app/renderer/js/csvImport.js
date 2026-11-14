// ============================================================
// js/csvImport.js — Bulk CSV import module for innovation entries
// Parses files using PapaParse, validates row data, renders 10-row preview,
// and submits valid records to POST /api/entries.
// Maximum ~150 lines for viva clarity.
// ============================================================

var parsedCsvRows = [];
var cachedCsvIndicators = [];

/**
 * Downloads a sample CSV with the expected columns:
 * indicator, title, description, date, value
 */
function downloadSampleCsv() {
  var sampleData =
    'indicator,title,description,date,value\n' +
    'Research Papers,Deep Learning for Medical Diagnosis,Published in IEEE Access,2026-10-15,1\n' +
    'Patents Filed,IoT Solar Tracking System,Application filed with Indian Patent Office,2026-10-22,1\n' +
    'Grants Received,DST-SERB AI Research Grant,Funded by Dept of Science & Tech,2026-11-01,500000\n' +
    'Startups Incubated,EduTech Learning Platform,Incubated at Campus Innovation Cell,2026-11-05,1\n' +
    'National Awards,Smart India Hackathon 1st Prize,Won nationwide technical competition,2026-11-10,1';

  var blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_innovation_entries.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ensures indicators are cached for row validation.
 */
function ensureIndicatorsLoaded() {
  if (cachedCsvIndicators.length > 0) return Promise.resolve(cachedCsvIndicators);
  return getIndicators().then(function (list) {
    cachedCsvIndicators = list || [];
    return cachedCsvIndicators;
  }).catch(function () {
    cachedCsvIndicators = [];
    return [];
  });
}

/**
 * Handles CSV file selection from the file input.
 * Parses the file on the client using PapaParse.
 */
function handleCsvFileSelect(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;

  ensureIndicatorsLoaded().then(function () {
    if (typeof Papa === 'undefined') {
      return showToast('PapaParse library is not loaded', 'error');
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        if (!results.data || results.data.length === 0) {
          return showToast('The selected CSV file is empty', 'error');
        }
        processParsedCsvRows(results.data);
      },
      error: function (err) {
        showToast('Failed to parse CSV: ' + err.message, 'error');
      }
    });
  });
}

