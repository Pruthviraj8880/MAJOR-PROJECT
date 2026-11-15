
// ============================================================
// api.js — Central API communication with the deployed backend
// ============================================================

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) headers['Authorization'] = 'Bearer ' + token;

  const url = CONFIG.API_BASE + endpoint;
  let response;

  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error('Cannot reach the backend. Check your internet connection.');
  }

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

// --- Authentication ---------------------------------------

function loginUser(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
}

// --- Departments ------------------------------------------

function getDepartments() {
  return apiRequest('/api/departments').then(function (res) {
    return res.departments || [];
  });
}

// --- Indicators -------------------------------------------

function getIndicators() {
  return apiRequest('/api/indicators').then(function (res) {
    return res.indicators || [];
  });
}


function prepareIndicatorPayload(indicator) {
  return getDepartments().then(function (departments) {
    var payload = { ...indicator };

    // If an ID is already provided, use it directly.
    if (payload.departmentId) {
      delete payload.department;
      return payload;
    }

    var departmentName = (payload.department || '').trim();

    delete payload.department;

    // Department is optional.
    if (!departmentName) {
      return payload;
    }

    var selectedDepartment = departments.find(function (department) {
      return department.name.toLowerCase() === departmentName.toLowerCase();
    });

    if (!selectedDepartment) {
      throw new Error('Selected department was not found.');
    }

    payload.departmentId = selectedDepartment.id;

    return payload;
  });
}

function createIndicator(indicator) {
  return prepareIndicatorPayload(indicator).then(function (payload) {
    return apiRequest('/api/indicators', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  });
}

function updateIndicator(id, indicator) {
  return prepareIndicatorPayload(indicator).then(function (payload) {
    return apiRequest('/api/indicators/' + id, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  });
}


function deleteIndicator(id) {
  return apiRequest('/api/indicators/' + id, {
    method: 'DELETE'
  });
}

// --- Entry response adapter --------------------------------

function normalizeEntry(entry) {
  if (!entry) return entry;

  var data = {};
  var versions = entry.versions || [];
  var latestVersion = versions.length
    ? versions[0]
    : null;

  if (latestVersion && latestVersion.data) {
    data = latestVersion.data;
  }

  var statusMap = {
    DRAFT: 'pending',
    SUBMITTED: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  };

  return {
    ...entry,
    title: entry.title || data.title || '',
    description: entry.description || data.description || '',
    indicatorId: entry.indicatorId,
    indicatorName: entry.indicator ? entry.indicator.name : '',
    submittedBy: entry.createdById,
    submittedByName: entry.createdBy ? entry.createdBy.name : '',
    status: statusMap[entry.status] || (entry.status || '').toLowerCase(),
    date: data.date || entry.createdAt,
    value: data.value,
    proofLink: data.proofLink || '',
    adminComment: data.adminComment || '',
    version: latestVersion ? latestVersion.version : undefined
  };
}

// --- Entries ----------------------------------------------

function getEntries() {
  return apiRequest('/api/entries?limit=100').then(function (res) {
    return (res.entries || []).map(normalizeEntry);
  });
}

function getEntry(id) {
  return apiRequest('/api/entries/' + encodeURIComponent(id)).then(function (res) {
    return normalizeEntry(res.entry || res);
  });
}

function createEntry(entry) {
  return apiRequest('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry)
  }).then(function (res) {
    return normalizeEntry(res.entry || res);
  });
}

function updateEntry(id, entry) {
  return apiRequest('/api/entries/' + encodeURIComponent(id), {
    method: 'PUT',
    body: JSON.stringify(entry)
  }).then(function (res) {
    return normalizeEntry(res.entry || res);
  });
}

// Backend updates status through PUT /api/entries/:id.
// Feedback is stored separately through /api/feedback.

function updateEntryStatus(id, status, comment) {
  var backendStatus = status.toUpperCase();

  return apiRequest('/api/entries/' + encodeURIComponent(id), {
    method: 'PUT',
    body: JSON.stringify({ status: backendStatus })
  }).then(function (res) {
    if (backendStatus === 'REJECTED' && comment) {
      return addComment(id, comment).then(function () {
        return res;
      });
    }
    return res;
  });
}

// --- Comments / Feedback ----------------------------------

function getComments(entryId) {
  return apiRequest('/api/feedback/entry/' + encodeURIComponent(entryId))
    .then(function (res) {
      return (res.feedbacks || []).map(function (item) {
        return {
          ...item,
          text: item.comment,
          userId: item.createdById,
          authorName: item.createdBy ? item.createdBy.name : 'Anonymous'
        };
      });
    });
}

function addComment(entryId, text) {
  return apiRequest('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({
      entryId: entryId,
      comment: text
    })
  });
}
