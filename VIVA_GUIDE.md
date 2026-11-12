# Viva Defense Guide: Portal for Innovation Excellence Indicators (Desktop App)

This guide is written in plain student language so you can confidently explain your project and answer any question the examiner or professor asks.

---

## 1. Project Overview & Your Role

- **Project:** "Portal for Innovation Excellence Indicators" for an educational institute.
- **Goal:** Tracks institutional innovation activities (Research Papers, Patents, Grants Received, Student/Faculty Startups, Awards) for NIRF, NAAC, and NBA accreditation reporting.
- **Your Subsystem:** The cross-platform **Desktop Application** built using **Electron**, plain HTML5, CSS3, and vanilla JavaScript.
- **Teammate's Subsystem:** The REST API backend (which provides `/api/auth`, `/api/indicators`, `/api/entries`, etc.).
- **Roles Implemented:**
  1. `admin` (Director / IQAC Coordinator): Manages indicator types, reviews, approves/rejects entries with feedback comments.
  2. `faculty`: Submits research papers, grants, patents; bulk imports via CSV.
  3. `student`: Submits startup ventures, patents, project awards; views feedback comments.

---

## 2. File-by-File Explanation (Viva Cheat Sheet)

| File | What it does (Viva answer) |
|---|---|
| `main.js` | The Electron Main Process. It initializes the desktop app, creates a secure Chromium `BrowserWindow`, and loads `login.html`. |
| `config.js` | Contains the central `CONFIG.API_BASE` URL. When moving from mock server to teammate's backend, we only edit this one string. |
| `mock-server/server.js` | A lightweight Express.js server providing fake data and JWT authentication so the desktop app can be developed and demonstrated independently. |
| `renderer/js/api.js` | The single API wrapper module. The `apiRequest()` helper attaches the Bearer JWT token to every request and automatically redirects to `login.html` if the token expires (401). |
| `renderer/js/auth.js` | Manages login submission, token saving in `localStorage`, `logout()`, and the `requireAuth()` guard that redirects unauthenticated users. |
| `renderer/js/ui.js` | Shared UI utility functions: floating toast alerts (`showToast()`), dynamic role-based navbar generation (`buildNav()`), and role visibility helpers. |
| `renderer/js/indicators.js` | Full CRUD logic for indicator types. Admins can create, edit, and delete indicators. Non-admins are blocked. |
| `renderer/js/entries.js` | Handles student/faculty achievement submissions, real-time keyword search, status filtering, and CSV report export. |
| `renderer/js/import.js` | Implements bulk CSV data ingestion using `PapaParse`. Previews data, matches indicator names/IDs, and batch-creates entries. |
| `renderer/js/approval.js` | Admin approval queue. Allows approving or rejecting submissions with reviewer feedback comments. |
| `renderer/js/comments.js` | Powers the discussion thread on `entry-detail.html`. Users and admins post feedback and clarifications on submissions. |
| `renderer/css/style.css` | Clean, neutral CSS stylesheet utilizing CSS variables for theme consistency across all screens without heavy CSS frameworks. |

---

## 3. Top 10 Viva Questions & Perfect Answers

### Q1: Why did you choose Electron over a standard web app?
> **Answer:** "Electron packages Chromium and Node.js together. It gives the institute an offline-first desktop executable (.exe or .dmg) with access to native desktop windows and native local file system capabilities (such as opening and parsing bulk CSV files locally), while maintaining cross-platform compatibility."

### Q2: Why did you use vanilla JavaScript instead of React or Angular?
> **Answer:** "For this module, our focus was maximum readability, minimal bundle size, and fast boot times. Vanilla JavaScript requires zero build step (no Webpack, Vite, or Babel), making every line of DOM manipulation easy to inspect, debug, and explain. It has zero external framework dependencies."

### Q3: How is user authentication handled?
> **Answer:** "When the user logs in via `POST /api/auth/login`, the backend signs a JSON Web Token (JWT) containing the user ID and role (`admin`, `faculty`, `student`). The frontend saves this token in browser `localStorage`. Every subsequent request made by `apiRequest()` in `api.js` automatically attaches this token in the `Authorization: Bearer <token>` HTTP header."

### Q4: How is Role-Based Access Control (RBAC) enforced on the client?
> **Answer:** "We use two levels of defense:
> 1. **Navigation & UI level:** The `buildNav(role)` function in `ui.js` only creates navigation tabs permitted for that role.
> 2. **Page-level guards:** In admin pages like `indicators.html` and `approval.html`, `initIndicatorsPage()` verifies `user.role === 'admin'`. If a student manually navigates there, they are alerted and redirected back to `dashboard.html`.
> 3. *Note for viva:* The server also validates the JWT on every endpoint, preventing unauthorized API calls even if the client is modified."

### Q5: How does the CSV bulk import work?
> **Answer:** "We use the lightweight `papaparse` library. When a faculty member selects a `.csv` file, PapaParse parses the file on the client side into JavaScript objects. We map the `indicator` column to existing database IDs, render an interactive preview table with validation badges, and then loop through each valid row to submit it via `createEntry()`."

### Q6: Why did you set `nodeIntegration: false` and `contextIsolation: true` in `main.js`?
> **Answer:** "Security best practice. By disabling `nodeIntegration` in the renderer window, malicious scripts or third-party web content cannot access the host machine's Node.js filesystem or OS commands (`child_process`, `fs`). The renderer stays sandboxed as a standard browser environment."

### Q7: What happens when the backend session expires?
> **Answer:** "In `api.js`, the central `apiRequest()` helper inspects the HTTP response status. If the status is `401 Unauthorized`, it clears `localStorage` and redirects the window to `login.html`, prompting the user to sign in again."

### Q8: How does the mock server help the team workflow?
> **Answer:** "In team software engineering, frontend and backend development often happen simultaneously. The Express mock server (`mock-server/server.js`) strictly mirrors the API contract agreed upon with my teammate. When the real backend is deployed, we only have to change the `CONFIG.API_BASE` URL in `config.js`."

### Q9: How is data exported for institutional reports (NIRF / NAAC)?
> **Answer:** "In `entries.js`, `exportEntriesToCsv()` reads the entries array, formats the records into comma-separated values, wraps them into a `data:text/csv` URI, and triggers a dynamic download using a hidden HTML `<a>` tag. No external libraries are needed."

### Q10: How would you package this app for distribution?
> **Answer:** "We can run `electron-packager` or `electron-builder`. It compiles the Electron binary, our HTML/CSS/JS, and creates an installer (`.exe` for Windows, `.dmg` for macOS, or `.AppImage` for Linux) that can be installed on institute computers."
