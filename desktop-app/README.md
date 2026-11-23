# Portal for Innovation Excellence Indicators (Desktop App)

A lightweight, high-performance desktop application built with **Electron**, **vanilla JavaScript**, **HTML5**, and **CSS3** for educational institutes to capture, review, and report innovation activities (research papers, patents, funding grants, student startups, and awards) for accreditation frameworks like **NIRF**, **NAAC**, and **NBA**.

---

## 1. What the App Does

Educational institutions must track quantifiable achievements across departments for national ranking metrics. This application replaces slow, error-prone manual spreadsheet tracking with a centralized system featuring:

- **Role-Based Access Control (RBAC):** Distinct dashboards and capabilities tailored for **Admins**, **Faculty**, and **Students**.
- **Indicator Management:** Admins define metrics (e.g., "Patents Filed", "DST Grants"), categorizing by Research, IP, Funding, Startup, or Award, along with measurement units (`count` or `amount`).
- **Achievement Submissions & Versioning:** Faculty and students submit evidence with dates, values, descriptions, and proof links. Editing an active pending submission increments its version number (e.g. `v1` → `v2`).
- **Approval Workflow & Rejection Reasons:** Admins review incoming entries, approve them, or reject them with mandatory feedback comments.
- **Interactive Discussion Thread:** A built-in feedback and comment box on every entry where users can discuss evidence or request revisions.
- **Bulk CSV Import with Validation:** Upload spreadsheets parsed directly on the client using **PapaParse** with real-time error checking and red-row preview.

---

## 2. How to Run the Application

### Prerequisites
- [Node.js](https://nodejs.org/) (v18, v20, or v22 recommended)
- `npm` (bundled with Node.js)

### Step-by-Step Execution

1. **Navigate to the desktop app folder:**
   ```bash
   cd desktop-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Mock API Server (Terminal 1):**
   ```bash
   npm run mock
   ```
   *The mock server starts at `http://localhost:3001` with preloaded test indicators, entries, and comments.*

4. **Launch the Electron Desktop Application (Terminal 2):**
   ```bash
   npm start
   ```

5. **Build an Installer / Executable:**
   ```bash
   npm run build        # Builds installer for current OS into dist/
   npm run build:mac    # Generates .dmg and .zip for macOS
   npm run build:win    # Generates .exe (NSIS installer) for Windows
   ```

### Pre-configured Test Accounts
| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@inst.edu` | `admin123` | Indicator CRUD, Approvals, All Entries, CSV Import |
| **Admin** | `aryan@gmail.com` | `password` (or any) | Indicator CRUD, Approvals, All Entries, CSV Import |
| **Faculty** | `faculty@inst.edu` | `faculty123` | My Entries, Add Entry, Version Edit, CSV Import |
| **Student** | `student@inst.edu` | `student123` | My Entries, Add Entry, Version Edit |

---

## 3. Folder Structure

```text
desktop-app/
├── package.json               # Desktop app dependencies, build scripts & electron-builder config
├── main.js                    # Electron main process (creates app window)
├── config.js                  # Central configuration (API_BASE URL)
├── mock-server/
│   └── server.js              # Standalone mock Express REST API (port 3001)
└── renderer/                  # Frontend UI files (HTML, CSS, vanilla JS)
    ├── login.html             # Login screen
    ├── dashboard.html         # Unified main dashboard layout with sidebar
    ├── import.html            # Standalone import page (also embedded in dashboard)
    ├── approval.html          # Standalone approvals page (also embedded in dashboard)
    ├── entry-detail.html      # Standalone entry detail discussion view
    ├── indicators.html        # Standalone indicators view
    ├── css/
    │   ├── style.css          # Main stylesheet (layout, cards, badges, responsive queries)
    │   └── analytics.css      # Analytics extension styling
    └── js/
        ├── api.js             # Fetch wrapper with JWT headers and error handling
        ├── auth.js            # Login handler, session storage & requireAuth guard
        ├── ui.js              # Role-based sidebar menu builder & section switcher
        ├── indicators.js      # Admin CRUD for indicators (validation & delete confirmation)
        ├── entries.js         # Entry submission, "My Entries" table & pending-only editing
        ├── approvals.js       # Admin approval workflow & mandatory rejection comment logic
        ├── comments.js        # Reusable discussion thread for reading & posting comments
        ├── csvImport.js       # PapaParse CSV reader, row validator, 10-row preview & importer
        └── import.js          # Backwards-compatibility proxy to csvImport.js
```

---

## 4. Simple Explanation of How Each File Works (Viva Guide)

Here is a straightforward explanation of each file's exact purpose in plain words:

- **`main.js` (Electron Main Process):**
  This is the desktop wrapper. It talks to the operating system to create the native desktop window (`BrowserWindow`), sets the initial dimensions (1100×750), enforces minimum window bounds (780×520), and loads `login.html`. When the user closes the window, it safely shuts down the Electron process.

- **`config.js` (Configuration):**
  Contains a single object `CONFIG = { API_BASE: 'http://localhost:3001' }`. All frontend files read from this so the API URL is defined in one place rather than hardcoded throughout the code.

- **`renderer/login.html` & `js/auth.js` (Authentication & Session):**
  `login.html` presents the email/password form. When submitted, `auth.js` calls `loginUser()` via `api.js`. Upon receiving the response, it stores the JWT `token` and the user profile (`name`, `role`, `id`) in browser `localStorage` and redirects to `dashboard.html`. `requireAuth()` guards protected pages by immediately kicking out unauthenticated visitors.

- **`renderer/dashboard.html` & `js/ui.js` (Role-Based Interface):**
  `dashboard.html` uses a single-page architecture with a left sidebar navigation and hidden/visible `<section>` tags in the main content area. `ui.js` inspects `currentUser.role`:
  - **Admin** receives: *Indicators*, *All Entries*, *Approvals*, *Import CSV*.
  - **Faculty** receives: *My Entries*, *Add Entry*, *Import CSV*.
  - **Student** receives: *My Entries*, *Add Entry*.
  Clicking any menu item runs `showSection(id)` which hides the active card, activates the selected section, and triggers its data loader.

- **`renderer/js/api.js` (Central API Client):**
  A clean wrapper around standard `fetch()`. It automatically attaches `Authorization: Bearer <token>` to headers, parses incoming JSON, catches HTTP 401s (token expiration) to trigger automatic logout, and transforms network drops into friendly error messages like *"Cannot reach the server. Is it running?"*.

- **`renderer/js/indicators.js` (Indicator Management — Admin):**
  Admin interface to create, list, edit, and delete accreditation indicators. It ensures indicator names cannot be empty, pre-fills the form for editing, requires explicit user confirmation (`confirm()`) before deletion, and reloads the table.

- **`renderer/js/entries.js` (Achievement Submissions — Faculty & Student):**
  Loads active indicators into a dropdown and handles innovation submissions with title, date, value, description, and proof URL. Displays "My Entries" with colored status badges (`pending`, `approved`, `rejected`) and version tags (`v1`, `v2`). Allows editing pending entries via `PUT /api/entries/:id`, triggering a version increment.

- **`renderer/js/approvals.js` (Review Workflow — Admin):**
  Loads pending submissions. Clicking a submission opens an inline review card displaying all evidence details. If rejecting, the admin **must** provide a comment; approving can be done with or without remarks. It sends `PUT /api/entries/:id/status` and refreshes the pending queue.

- **`renderer/js/comments.js` (Entry Discussion & Feedback Thread):**
  Provides a standalone comment module. Fetches feedback via `GET /api/entries/:id/comments` and renders author names, timestamps, and messages. Submitting the comment form posts to `POST /api/entries/:id/comments` and updates the thread in real time.

- **`renderer/js/csvImport.js` (Bulk CSV Import):**
  Handles bulk data entry. Uses `PapaParse` to parse `.csv` files locally in the renderer. Validates that every row has an existing indicator, valid `YYYY-MM-DD` date, and positive numeric value. Previews the first 10 rows with invalid rows highlighted in **red** and showing specific error reasons. Only valid rows are sent to `POST /api/entries`, culminating in a summary banner like *"18 imported, 2 skipped"*.

---

## 5. How Data Flows (Architecture Walkthrough)

Every interaction in this application follows a strict 5-stage lifecycle:

```text
1. User Action
   ├── User clicks a button (e.g., "Submit Achievement", "Approve", or "Post Comment")
   └── DOM event fires (onsubmit or onclick)

2. Module Handler & Client Validation
   ├── The module script (e.g., entries.js or approvals.js) catches the event
   ├── Input fields are extracted and sanitized
   ├── Client-side validation checks run (e.g., name not empty, value > 0, date valid)
   └── UI shows immediate feedback (e.g., button disabled, text set to "Submitting…")

3. Network Layer (api.js)
   ├── The handler calls a helper function in api.js (e.g., createEntry(payload))
   ├── api.js pulls the active JWT from localStorage and attaches `Authorization: Bearer <token>`
   ├── Calls standard browser `fetch(CONFIG.API_BASE + endpoint)`
   └── If the server cannot be reached, throws a human-readable network error

4. Backend Execution
   ├── Express server receives the request
   ├── authMiddleware verifies the JWT signature and extracts user identity
   ├── Controller validates payload and updates database/state
   └── Server returns HTTP 200/201 with the created/updated JSON object

5. UI Update & Toast Notification
   ├── The Promise resolves in the module script
   ├── DOM is re-rendered (e.g., new row injected into the table, count badge incremented)
   ├── Input form is reset to initial state and buttons re-enabled
   └── `showToast("Achievement submitted (version 1)", "success")` displays feedback
```

---

## 6. Honest Viva Disclosure (What is Real vs. Mocked)

To answer questions from external examiners with full transparency and confidence:

### ✅ What is Fully Implemented & Working
1. **Complete Desktop Client Architecture:** Pure vanilla JavaScript, modular design (each core script kept ≤ 150 lines), zero heavy dependencies, native Electron packaging for Windows (`.exe`) and macOS (`.dmg`).
2. **Role-Based Security:** Dynamic menu building and route guards enforced by decoded JWT roles (`admin`, `faculty`, `student`).
3. **Indicator Management:** Full CRUD operations with non-empty validation and `confirm()` safety prompts.
4. **Achievement Versioning:** Updates to pending entries trigger server-side version increments (e.g. `v1` → `v2`) while locking approved/rejected entries from unauthorized edits.
5. **Approval Workflow:** Real-time status transitions with enforced comment validation for rejections.
6. **Entry Discussion Threads:** Real-time comments with author attribution and formatted timestamps.
7. **Bulk CSV Parsing & Validation:** In-browser parsing with PapaParse, row error detection, invalid red-row highlighting, and sequential API dispatch.

### ⚠️ What is Mocked or Simplified
1. **Mock Server Storage:** The included `mock-server/server.js` (port 3001) stores data in **in-memory JavaScript arrays**. It restarts with default seed data when stopped. This is intentional to allow viva demonstrations without requiring PostgreSQL installation on the examiner's laptop.
2. **Real Backend Compatibility:** The teammate's backend located in `src/` uses PostgreSQL, Prisma ORM, and Express (port 3000). The desktop app's `api.js` has built-in fallback compatibility for both backends simply by editing `config.js`.
3. **Proof Storage:** Proofs and evidence are stored as **external verified URLs** (DOI links, patent database links, cloud drive URLs) rather than multipart binary file uploads to avoid server storage bloat.
4. **Credential Security:** JWT tokens are persisted in browser `localStorage`. A production banking-grade application would utilize Electron's native `safeStorage` API or OS keychain.


---

## 7. Database Engineering (DE) Viva Guide

For the complete technical breakdown of the database architecture, ER diagrams, 3NF/BCNF normalization proof, serializable concurrency control, and 100× scaling strategies, see:
👉 [**`DE_QUESTIONS_AND_ANSWERS.md`**](../DE_QUESTIONS_AND_ANSWERS.md)
