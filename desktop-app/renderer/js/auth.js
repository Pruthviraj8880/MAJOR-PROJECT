// ============================================================
// auth.js — Login form handler + session helpers.
// Stores token and user info in localStorage so other pages
// can check who's logged in and what role they have.
// ============================================================

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errorDiv.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Logging in…';

  loginUser(email, password)
    .then(function (data) {
      // Save the JWT and user details for other pages to read
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    })
    .catch(function (err) {
      errorDiv.textContent = err.message;
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

