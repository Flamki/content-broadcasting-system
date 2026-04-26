# Content Broadcasting System (Backend)

Production-grade backend for the Content Broadcasting System technical assignment.

## Tech Stack

- **Runtime:** Node.js (≥18) + Express
- **Database:** PostgreSQL (Prisma ORM)
- **Cache:** Redis (optional — app works without it)
- **Auth:** JWT + bcrypt password hashing + RBAC (Principal / Teacher)
- **Upload:** Multer (memory storage) → local filesystem or AWS S3
- **Validation:** Zod schema validation
- **Rate Limiting:** express-rate-limit (3-tier)
- **Docs:** OpenAPI 3.0 + Swagger UI
- **Testing:** Node.js built-in test runner
- **Containerization:** Docker + docker-compose

## Features

### Core
- **Authentication** — Register/login with JWT tokens and bcrypt password hashing
- **RBAC** — Strict role separation: Teacher uploads, Principal reviews
- **Content Upload** — JPG/PNG/GIF images up to 10MB with metadata
- **Approval Workflow** — uploaded → pending → approved / rejected (with mandatory reason)
- **Subject-based Scheduling** — Time-windowed content with per-subject rotation
- **Public Broadcasting** — Teacher-scoped public endpoint with live content selection
- **Edge Case Handling** — No content, not scheduled, invalid subject, invalid teacher key

### Bonus Features
- **S3 Upload** — Full AWS S3 integration with setup guides
- **Redis Caching** — Cached live endpoint responses with automatic invalidation
- **Rate Limiting** — 3-tier protection (global / auth / public endpoints)
- **Subject-wise Analytics** — Dashboard data with per-subject and per-teacher breakdown
- **Pagination & Filters** — Status, subject, teacher, page, limit filters on admin endpoint
- **Docker** — One-command deployment with docker-compose

## Quick Start

### Prerequisites
- Node.js ≥ 18
- PostgreSQL (local or Docker)
- Redis (optional — for caching)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and other settings
```

### 3. Database setup
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed users
```bash
npm run db:seed
```

### 5. Start server
```bash
npm run dev
```

The server starts at `http://localhost:4000` with:
- API at `/api/*`
- Swagger UI at `/api-docs`
- Health check at `/health`

### Docker (Alternative)
```bash
docker-compose up --build
```
This starts PostgreSQL, Redis, and the app. Run migrations after:
```bash
docker-compose exec app npx prisma migrate deploy
docker-compose exec app npm run db:seed
```

## Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| Principal | `principal@example.com` | `Principal@123` |
| Teacher 1 | `teacher1@example.com` | `Teacher@123` |
| Teacher 2 | `teacher2@example.com` | `Teacher@123` |

## API Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login and get JWT | No |

### Teacher (JWT + role TEACHER)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/content/upload` | Upload content (multipart form-data) |
| GET | `/api/content/my` | View own uploaded content |

### Principal (JWT + role PRINCIPAL)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content/admin/all` | List all content (with filters & pagination) |
| GET | `/api/content/admin/pending` | List pending content for review |
| PATCH | `/api/content/admin/:id/approve` | Approve content |
| PATCH | `/api/content/admin/:id/reject` | Reject content (requires reason) |
| GET | `/api/analytics/subjects` | Subject-wise analytics dashboard |

### Public (No JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content/live/:teacherKey` | Get currently active content for teacher |

#### Live Endpoint Examples
```
GET /api/content/live/teacher-1
GET /api/content/live/1
GET /api/content/live/teacher-1?subject=maths
GET /api/content/live/teacher-2?subject=science
```

## Upload Form-Data

For `POST /api/content/upload`:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image (JPG/PNG/GIF, max 10MB) |
| `title` | String | Yes | Content title |
| `subject` | String | Yes | Subject name (e.g., maths, science) |
| `description` | String | No | Optional description |
| `startTime` | ISO DateTime | No* | When content becomes visible |
| `endTime` | ISO DateTime | No* | When content stops being visible |
| `rotationDurationMinutes` | Integer | No | Rotation duration (default: 5 min) |

> \* `startTime` and `endTime` must either both be provided or both be omitted. Without them, content won't appear on the live endpoint.

## Folder Structure

```
prisma/
  schema.prisma          # Database schema
  seed.js                # Seed users
  migrations/            # Auto-generated migrations
src/
  config/
    db.js                # Prisma client
    env.js               # Environment config
    redis.js             # Redis client (optional)
  constants/
    enums.js             # Role and status enums
  controllers/
    auth.controller.js   # Auth route handlers
    content.controller.js # Content route handlers
    analytics.controller.js # Analytics route handler
  middlewares/
    auth.middleware.js    # JWT verification
    error.middleware.js   # Global error handler
    rate-limit.middleware.js # Rate limiting (3-tier)
    role.middleware.js    # RBAC enforcement
    upload.middleware.js  # Multer file upload
    validate.middleware.js # Zod schema validation
  routes/
    index.js             # Route aggregator
    auth.routes.js       # Auth routes
    content.routes.js    # Content routes
    analytics.routes.js  # Analytics routes
  services/
    auth.service.js      # Auth business logic
    content.service.js   # Content CRUD + approval
    live.service.js      # Live broadcast + rotation
    storage.service.js   # Local/S3 file storage
    cache.service.js     # Redis cache abstraction
    analytics.service.js # Analytics aggregation
  utils/
    api-error.js         # Custom error class
    async-handler.js     # Express async wrapper
    jwt.js               # JWT sign/verify
    subject.js           # Subject normalizer
  app.js                 # Express app setup
  server.js              # Entry point + graceful shutdown
tests/
  live.service.test.js   # Comprehensive unit tests
docs/
  openapi.yaml           # OpenAPI 3.0 specification
  s3-setup.md            # S3 configuration guide
  s3-bucket-policy-public-read.json
  s3-cors.json
  postman-collection.json # Postman collection
uploads/                 # Local file storage
architecture-notes.txt   # Architecture & design decisions
Dockerfile               # Container image
docker-compose.yml       # Full stack setup
```

## Tests

Run the unit test suite:
```bash
npm test
```

Tests cover:
- `parseTeacherKey` — all input variants (prefixed, numeric, invalid, edge cases)
- `pickActiveFromGroup` — rotation logic, single item, empty group, mixed durations, sorting, zero duration
- `normalizeSubject` — normalization, null handling, type checks
- `ApiError` — constructor, details, inheritance
- JWT utilities — sign/verify roundtrip, invalid token rejection
- Cache key builder — key generation with/without subject

## API Documentation

- **Swagger UI:** `http://localhost:4000/api-docs` (when server is running)
- **OpenAPI Spec:** `docs/openapi.yaml`
- **Postman Collection:** `docs/postman-collection.json`

## Rate Limiting

| Scope | Window | Max Requests |
|-------|--------|-------------|
| Global (all endpoints) | 1 minute | 100 |
| Auth (login/register) | 15 minutes | 20 |
| Public (live endpoint) | 1 minute | 60 |

## Redis Caching

- **Optional** — App works fully without Redis
- Live endpoint responses cached with 30s TTL (configurable)
- Cache automatically invalidated on content approval/rejection
- Set `REDIS_URL` in `.env` to enable

## S3 Upload (Bonus)

- Set `STORAGE_DRIVER=s3` in `.env`
- See `docs/s3-setup.md` for step-by-step configuration
- Files stored at: `content/teacher-{id}/{subject}/...`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `NODE_ENV` | development | Environment |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRES_IN` | 12h | Token expiry |
| `MAX_FILE_SIZE_MB` | 10 | Max upload size |
| `DEFAULT_ROTATION_MINUTES` | 5 | Default rotation duration |
| `STORAGE_DRIVER` | local | `local` or `s3` |
| `REDIS_URL` | — | Redis connection string (optional) |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Global rate limit window |
| `RATE_LIMIT_MAX` | 100 | Global rate limit max requests |
| `LIVE_CACHE_TTL_SECONDS` | 30 | Live endpoint cache TTL |

## Assumptions

- Only one Principal account is allowed per system (enforced at registration).
- Content without `startTime`/`endTime` is approved but not eligible for the live endpoint.
- Subject names are normalized to lowercase for consistency.
- Rejected content cannot be directly re-approved (requires re-upload).
- Redis is optional — caching is a performance enhancement, not a requirement.
- File storage is abstracted — switching between local and S3 requires only an env change.
