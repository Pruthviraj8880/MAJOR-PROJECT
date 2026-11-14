// ============================================================
// api.js — Every fetch call lives here.
// One helper (apiRequest) attaches the JWT token automatically
// and handles errors, so the rest of the app never worries about it.
// ============================================================

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // If we have a saved token, send it with every request
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const url = CONFIG.API_BASE + endpoint;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error('Cannot reach the server. Is it running?');
  }

  // 401 means our token expired or is invalid → send back to login
  if (response.status === 401) {
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed (HTTP ' + response.status + ')');
  }
  return data;
}

// --- Auth ------------------------------------------------

function loginUser(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

// --- Indicators ------------------------------------------

function getIndicators() {
  return apiRequest('/api/indicators').then(function (res) {
    if (res && res.indicators && Array.isArray(res.indicators)) {
      return res.indicators;
    }
    return Array.isArray(res) ? res : [];
  });
}

function createIndicator(indicator) {
  return apiRequest('/api/indicators', {
    method: 'POST',
    body: JSON.stringify(indicator)
  });
}

function updateIndicator(id, indicator) {
  return apiRequest('/api/indicators/' + id, {
    method: 'PUT',
    body: JSON.stringify(indicator)
  });
}

function deleteIndicator(id) {
  return apiRequest('/api/indicators/' + id, {
    method: 'DELETE'
  });
}

// --- Entries ---------------------------------------------

function getEntries() {
  return apiRequest('/api/entries').then(function (res) {
    if (res && res.entries && Array.isArray(res.entries)) return res.entries;
    return Array.isArray(res) ? res : [];
  });
}

function getEntry(id) {
  return apiRequest('/api/entries/' + id).then(function (res) {
    return (res && res.entry) ? res.entry : res;
  });
}

function createEntry(entry) {
  return apiRequest('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry)
  }).then(function (res) {
    if (res && res.entry) {
      var item = res.entry;
      if (res.version) item.version = typeof res.version === 'object' ? res.version.version : res.version;
      return item;
    }
    return res;
  });
}

function updateEntry(id, entry) {
  return apiRequest('/api/entries/' + id, {
    method: 'PUT',
    body: JSON.stringify(entry)
  }).then(function (res) {
    if (res && res.entry) {
      var item = res.entry;
      if (res.version) item.version = typeof res.version === 'object' ? res.version.version : res.version;
      return item;
    }
    return res;
  });
}

function updateEntryStatus(id, status, comment) {
  return apiRequest('/api/entries/' + id + '/status', {
    method: 'PUT',
    body: JSON.stringify({ status: status, comment: comment })
  });
}

// --- Comments / Feedback ---------------------------------
function getComments(entryId) {
  return apiRequest('/api/entries/' + entryId + '/comments').then(function (res) {
    if (Array.isArray(res)) return res;
    return (res && (res.comments || res.feedback)) || [];
  });
}

function addComment(entryId, text) {
  return apiRequest('/api/entries/' + entryId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ text: text })
  });
}

