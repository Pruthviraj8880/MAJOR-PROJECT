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
