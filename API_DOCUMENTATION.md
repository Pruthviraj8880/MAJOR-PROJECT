# Backend API Documentation

**Project:** Major Project  
**Module:** Backend, Authentication & Database  
**Technology:** Node.js, Express.js, PostgreSQL, Prisma ORM  
**API Base URL:** `http://localhost:3000`

---

## 1. Authentication APIs

**Base Path:** `/api/auth`

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/register` | Register a new user | Not required |
| POST | `/login` | Authenticate user and generate JWT | Not required |
| GET | `/me` | Get currently authenticated user | Required |

### Features
- User registration with password hashing.
- User login with email and password.
- JWT-based authentication.
- Passwords are securely hashed using bcrypt.
- Authenticated user details can be retrieved using `/me`.

---

## 2. User Management APIs

**Base Path:** `/api/users`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all users |
| GET | `/:id` | Get user by ID |
| POST | `/` | Create a user |
| PUT | `/:id` | Update a user |
| DELETE | `/:id` | Delete a user |

**Authorization:** Admin only.

### Features
- Retrieve all registered users.
- Retrieve an individual user.
- Create new users.
- Update existing user details.
- Delete users.

---

## 3. Department Management APIs

**Base Path:** `/api/departments`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all departments |
| GET | `/:id` | Get department by ID |
| POST | `/` | Create a department |
| PUT | `/:id` | Update a department |
| DELETE | `/:id` | Delete a department |

**Authorization:** Admin only.

### Features
- Department creation and management.
- Retrieve department details.
- View related user and indicator counts.
- Update and delete departments.

---

## 4. Indicator Management APIs

**Base Path:** `/api/indicators`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all indicators |
| GET | `/:id` | Get indicator by ID |
| POST | `/` | Create an indicator |
| PUT | `/:id` | Update an indicator |
| DELETE | `/:id` | Delete an indicator |

**Authorization:** Admin only.

### Features
- Create and manage indicators.
- Associate indicators with departments.
- Retrieve indicator details.
- View related entry counts.
- Validate indicator and department relationships.

---

## 5. Entry Management APIs

**Base Path:** `/api/entries`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all entries |
| GET | `/:id` | Get entry by ID |
| POST | `/` | Create an entry |
| PUT | `/:id` | Update an entry |
| GET | `/:id/versions` | Get entry version history |

### Authorization
- Admin, Faculty and Student can view entries.
- Admin, Faculty and Student can view entry version history.
- Admin and Faculty can create entries.
- Admin and Faculty can update entries.
- Only Admin can approve or reject entries.

### Features
- Entry creation automatically creates Version 1.
- Every successful entry update creates a new version.
- Previous versions are preserved in the database.
- Entry listing supports pagination.
- Concurrent updates use Serializable transaction isolation with retry handling.
- Entry status supports DRAFT, SUBMITTED, APPROVED and REJECTED.

### Pagination Example

`GET /api/entries?page=1&limit=10`

**Pagination parameters:**

| Parameter | Description | Default |
|---|---|---|
| page | Page number | 1 |
| limit | Number of entries per page | 10 |

The maximum allowed page limit is 100.

---

## 6. Feedback APIs

**Base Path:** `/api/feedback`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create feedback |
| GET | `/entry/:entryId` | Get feedback for an entry |
| PUT | `/:id` | Update feedback |
| DELETE | `/:id` | Delete feedback |

### Authorization
- All authenticated roles can create and read feedback.
- Feedback creators can update and delete their own feedback.
- Admin can update and delete any feedback.

### Features
- Create feedback for entries.
- Retrieve feedback associated with an entry.
- Update existing feedback.
- Delete feedback.
- Feedback operations are recorded in audit logs.

---

## 7. Audit Log APIs

**Base Path:** `/api/audit-logs`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Get all audit logs |
| GET | `/:id` | Get audit log by ID |

**Authorization:** Admin only.

### Supported Filters

The audit log listing API supports:

| Parameter | Description |
|---|---|
| `userId` | Filter logs by user ID |
| `entity` | Filter logs by entity |
| `action` | Filter logs by action |

### Example Requests

Get all audit logs:

`GET /api/audit-logs`

Filter by action:

`GET /api/audit-logs?action=LOGIN`

Filter by entity:

`GET /api/audit-logs?entity=ENTRY`

### Features
- Records important backend operations.
- Tracks CREATE, UPDATE and DELETE operations.
- Records login activity.
- Stores associated user and entity information.
- Supports filtering and retrieving individual audit records.

---

## 8. Server Health APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check whether the backend server is running |
| GET | `/api/health` | Check backend health status |

### Example Response

`GET /`

```json
{
  "success": true,
  "message": "Backend is running!"
}
```

**Note:** The current health endpoint returns a static database status. It does not independently verify the live database connection.

---

## 9. Authentication and Authorization

All protected APIs require a valid JWT access token.

### Authorization Header

Include the following HTTP header in protected API requests:

`Authorization: Bearer YOUR_JWT_TOKEN`

### User Roles

| Role | Description |
|---|---|
| ADMIN | Administrative access to authorized modules |
| FACULTY | Can create and update entries and participate in feedback |
| STUDENT | Can view entries and participate in feedback |

Individual endpoint permissions are enforced using role-based authorization middleware and controller-level checks.

### Authentication Rules
- Registration does not require authentication.
- Login does not require authentication.
- The `/api/auth/me` endpoint requires a valid JWT.
- All other protected endpoints require authentication.

---

## 10. Database Models

The backend uses PostgreSQL as its relational database and Prisma ORM for database operations.

### Main Database Models

1. User
2. Department
3. Indicator
4. Entry
5. EntryVersion
6. Feedback
7. AuditLog

### Database Features
- Relational data modelling.
- Primary and foreign key relationships.
- Unique constraints.
- Referential integrity.
- Entry version history.
- JSON-based version data and audit metadata.

---

## 11. Error Handling

The API uses standard HTTP status codes.

| Status Code | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created successfully |
| 400 | Invalid request |
| 401 | Authentication required or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Resource conflict |
| 500 | Internal server error |

API responses generally contain a `success` field and a descriptive message.

---

## 12. Running the Backend Locally

### Prerequisites
- Node.js
- npm
- PostgreSQL
- Git

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the Backend project root.

Configure the following variables:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME?schema=public"
JWT_SECRET="YOUR_SECRET_KEY"
PORT=3000
```

Replace the database username, password and database name with your local PostgreSQL configuration.

**Important:** Never commit `.env` to GitHub. Keep database credentials and JWT secrets private.

### Step 3: Run Prisma Migrations

```bash
npx prisma migrate dev
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Start Development Server

```bash
npm run dev
```

The backend server will run at:

`http://localhost:3000`

### Step 6: Verify Server

Open the following endpoint in your browser:

`http://localhost:3000`

Expected response:

```json
{
  "success": true,
  "message": "Backend is running!"
}
```

---

## 13. Project Structure

```text
Backend/
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── API_DOCUMENTATION.md
```

---

**Documentation Status:** Covers the implemented Member 1 backend APIs and their verified route-level permissions.
