# Innovation Excellence Indicators Portal — Major Project

A comprehensive portal for tracking institutional innovation activities (research papers, patents, funding grants, student startups, and awards) for NIRF, NAAC, and NBA accreditation.

---

## Repository Structure

- **[`desktop-app/`](./desktop-app)** — Electron desktop application (HTML5, CSS3, Vanilla JavaScript, PapaParse).
  - Built with responsive UI, role-based dashboards (Admin, Faculty, Student), indicator CRUD, entry submissions with versioning, admin approval flow, comments thread, and client-side bulk CSV import.
  - Complete viva documentation, architecture flow, and file-by-file explanations are in [**`desktop-app/README.md`**](./desktop-app/README.md).
- **[`src/`](./src)** — Central Node.js, Express, and Prisma ORM backend connected to PostgreSQL.
- **[`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)** — Comprehensive REST API endpoint reference and database schemas.

---

## Quick Start (Desktop App)

```bash
cd desktop-app
npm install

# Terminal 1: Run mock API server (:3001)
npm run mock

# Terminal 2: Launch desktop app
npm start

# Build standalone desktop installer (.dmg / .exe)
npm run build
```

---

## Team & Contribution Summary

- **Desktop Application (Member 1 / Aditya Raj Singh):**
  - Electron main process & configuration.
  - Role-based login and dynamic dashboard menu.
  - Indicator management module (Admin CRUD with validation).
  - Achievement entry submissions and versioning (Faculty & Student).
  - Admin approval workflow and comments thread.
  - Bulk CSV import with PapaParse and real-time row error validation.
  - Window resizing responsiveness and electron-builder packaging.
- **Backend API & Database (Member 2):**
  - Express REST controllers, middleware, Prisma models, audit logs, and PostgreSQL schema.
- **Analytics, Reports & Leaderboards (Member 3):**
  - Chart.js analytics visualizations, PDF/CSV export, and institutional leaderboards.
