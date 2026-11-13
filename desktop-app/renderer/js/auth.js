// ============================================================
// auth.js — Login form handler + session helpers.
// Stores token and user info in localStorage so other pages
// can check who's logged in and what role they have.
// ============================================================

function handleLogin(event) {
  event.preventDefault();

  var email = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var errorDiv = document.getElementById('login-error');
  var btn = document.getElementById('login-btn');

  errorDiv.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Logging in…';

  loginUser(email, password)
    .then(function (data) {
      var user = data.user || {};
      var normalizedRole = (user.role || '').toLowerCase();

      // Save token and normalized user info in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizedRole
      }));
      window.location.href = 'dashboard.html';
    })
    .catch(function (err) {
      errorDiv.textContent = err.message || 'Login failed';
      btn.disabled = false;
      btn.textContent = 'Log In';
    });
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

// Call this on every page except login.
// Redirects to login if no token is found.
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return null;
  }
  return JSON.parse(localStorage.getItem('user'));
}

// Just get the current user without redirecting
function getCurrentUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

