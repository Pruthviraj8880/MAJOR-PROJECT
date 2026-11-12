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
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const url = CONFIG.API_BASE + endpoint;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    // Network error — server is probably not running
    throw new Error('Cannot reach the server. Is it running?');
  }

  // 401 means our token expired or is invalid → send back to login
  if (response.status === 401) {
    localStorage.clear();
    window.location.href = 'login.html';
    return;
  }

  // Try to parse JSON; some responses (like DELETE) might be empty
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
  return apiRequest('/api/indicators');
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
  return apiRequest('/api/entries');
}

function getEntry(id) {
  return apiRequest('/api/entries/' + id);
}

function createEntry(entry) {
  return apiRequest('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry)
  });
}

function updateEntry(id, entry) {
  return apiRequest('/api/entries/' + id, {
    method: 'PUT',
    body: JSON.stringify(entry)
  });
}

function updateEntryStatus(id, status, comment) {
  return apiRequest('/api/entries/' + id + '/status', {
    method: 'PUT',
    body: JSON.stringify({ status, comment })
  });
}

// --- Comments --------------------------------------------

function getComments(entryId) {
  return apiRequest('/api/entries/' + entryId + '/comments');
}

function addComment(entryId, text) {
  return apiRequest('/api/entries/' + entryId + '/comments', {
    method: 'POST',
    body: JSON.stringify({ text })
  });
}

