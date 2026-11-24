# KaushalSetu · Phase 2

KaushalSetu keeps its existing plain JavaScript SPA and styling, with an Express API and PostgreSQL as the configured source of truth. Passwords are bcrypt-hashed; the server issues an opaque `HttpOnly`, `SameSite=Strict` cookie and stores only a hash of the session token. API role checks are server-side. The browser keeps no business records in localStorage. The language preference remains local.

## Requirements and local setup

- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm (required to install the declared backend packages)

From the project folder:

```sh
npm install
Copy-Item .env.example .env
```

Create a dedicated development database, then edit `.env` with its connection string:

```sh
psql -U postgres -c "CREATE DATABASE kaushalsetu;"
```

Run the schema and sample seed, then start the app:

```sh
npm run db:migrate
npm run db:seed
npm start
```

Open `http://127.0.0.1:4173`. For managed PostgreSQL, set `DATABASE_URL` and `PGSSL=true`. Use a least-privilege database user outside local development. Set `NODE_ENV=production` behind HTTPS so the session cookie is Secure; only set `TRUST_PROXY=true` behind a trusted reverse proxy.

## Demo accounts

The seed command hashes the demo password into PostgreSQL; it is not included in frontend seed data.

| Role | Email | Password |
|---|---|---|
| Job seeker | `seeker@demo.in` | `Demo@123` |
| Employer | `employer@demo.in` | `Demo@123` |
| Training centre | `centre@demo.in` | `Demo@123` |
| Government admin | `admin@demo.in` | `Demo@123` |

These intentionally simple credentials are for isolated demonstrations only. Change or remove seeded accounts before deploying to a shared environment.

## Database schema

`backend/schema.sql` creates these related tables and indexes:

- `users`, `sessions`, `organizations`
- `skills`, `jobs`, `job_applications`, `candidate_shortlists`
- `courses`, `course_enrollments`
- `apprenticeships`, `apprenticeship_applications`, `recruitment_drives`
- `certificates`, `notifications`, `government_analytics`
- `district_employment_analytics` view

Foreign keys, unique constraints, role/status checks, seat/attendance constraints and indexes are defined in the schema. The Express API uses parameterized PostgreSQL queries. Admin review and role permissions are checked on the server.

## API endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public; seeker, employer or centre registration |
| POST | `/api/auth/login` | Public, rate limited |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/session` | Authenticated |
| GET | `/api/public/bootstrap` | Public published listings and partners |
| GET | `/api/public/certificates/:id` | Public demo certificate verification |
| GET | `/api/portal/bootstrap` | Authenticated; role-filtered portal data |
| POST | `/api/portal/sync` | Authenticated; server rejects cross-role writes |
| POST | `/api/resumes` | Seeker; PDF/DOC/DOCX, 3 MB maximum, content signature checked |
| GET | `/api/employer/candidates` | Employer |
| POST | `/api/employer/shortlist/:candidateId` | Employer |
| GET | `/api/employer/candidates/:id/resume` | Employer with an application or shortlist relationship |
| POST | `/api/certificates` | Seeker with a completed course |
| POST | `/api/admin/users/:id/review` | Admin |
| POST | `/api/admin/listings/review` | Admin |
| GET | `/api/admin/analytics` | Admin |
| GET | `/api/status` | Health check |

The existing frontend uses `api-client.js` to call these routes and reload remote records. Job matching remains the local 60% skills + 25% experience + 15% education prototype. The assistant remains a mock responder; no AI service is called.

## Migrations, seeds and legacy browser data

`npm run db:migrate` is repeatable for this initial schema. `npm run db:seed` inserts the ten sample jobs and courses, partner organizations, apprenticeships, drives and four demo users without overwriting existing job/course IDs.

If the previous prototype has customized data in browser localStorage, open the login page on the old site and use **Download data backup** if it appears. Then import the JSON after migration and seed:

```sh
node scripts/import-legacy.js path/to/kaushalsetu-legacy-backup.json
```

The importer hashes legacy passwords, imports profile/job/course/application/enrolment data, skips conflicting seeded job/course IDs, and marks imported custom listings pending admin review. Accounts with no usable legacy password get a random hash and must have their password reset. Keep the exported backup private because it may contain old plaintext passwords and personal profile data; delete it after migration.

## Tests

Run JavaScript syntax checks with:

```sh
node --check server.js
node --check app.js
node --check api-client.js
```

The integration suite uses a seeded, isolated local test database and performs writes. Point it at the test server explicitly:

```sh
$env:TEST_API_BASE_URL='http://127.0.0.1:4173'
npm test
```

It checks authentication, protected routes, role restrictions, admin analytics/review, job posting/application persistence, course publishing/enrolment, and valid/invalid resume uploads. Do not point it at production data.

## External services and deployment limits

- PostgreSQL must be configured and reachable; the current workspace does not include a PostgreSQL server or connection credentials.
- Resume uploads currently use a private local server directory and protected download route. Deploy with a persistent, access-controlled volume. Supabase Storage is not configured or connected.
- There is no email verification, password-reset email, Bhashini, real AI model, government API, beneficiary verification, or stipend integration.
- Matching/skill gap calculations and the assistant responses are local prototype logic.
- Certificates are demo records. The QR image uses the existing third-party QR image endpoint; scan-to-verify from another device requires a publicly reachable HTTPS deployment.
- Imported old browser data can contain personal information; keep its backup private and remove it after a verified import.
