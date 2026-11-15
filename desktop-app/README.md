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
