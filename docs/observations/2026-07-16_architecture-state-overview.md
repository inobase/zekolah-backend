# Observasi: Arsitektur & State Project — Zekolah Backend v1.0.5

> **Date:** 2026-07-16
> **Scope:** Review menyeluruh arsitektur layer, dependencies, test coverage, dan readiness production.
> **Version:** v1.0.5 (after swagger integration docs)

---

## 1. Arsitektur Saat Ini

### 1.1 Layer Structure (MVC + Repositories)

```
src/
├── app.ts                  ← Fastify factory, plugins, authenticate decorator
├── index.ts                ← Entry point, server startup
├── config/
│   ├── index.ts            ← Dotenv + config object
│   └── database.ts         ← Knex singleton (mysql2)
├── controllers/            ✅ 13 controllers — thin HTTP handlers
├── services/               ✅ 13 services — business logic
├── repositories/           ✅ 14 repositories — data access (Raw SQL + Knex query builder)
├── models/interfaces/      ✅ TypeScript interfaces per entity
├── middlewares/            ✅ errorHandler, requireRole
├── validators/             ✅ 14 Zod schemas (body/query validation)
├── routes/                 ✅ 14 route files + index.ts aggregator
└── utils/
    ├── AppError.ts         ✅ Custom error class with type-safe codes
    ├── logger.ts           ✅ Pino logger
    └── roleResolver.ts     ✅ Role resolution logic (scoped)
```

### 1.2 Layer Communication Flow

```
Client Request
  → routes/ (registration + schema parse)
    → middleware (authenticate → resolveRoles)
      → controllers/ (parse typed body/query, delegate)
        → services/ (business logic + transactions)
          → repositories/ (Knex queries)
            → Database (MySQL)
```

### 1.3 Repository Layer — Raw SQL Strategy

Semua repository menggunakan **knex query builder** dengan raw SQL untuk complex queries:

```typescript
// SchoolRepository.findAll — pakai query builder
this.knex('schools').where({ id }).first()

// UserRoleRepository.findActive — raw SQL UNION
knex.raw(`... union query ...`)
```

**Observasi:** Tidak ada ORM — pure query builder + raw SQL. Ini intentional untuk performa dan kontrol penuh atas SQL.

---

## 2. Validasi & Type Safety

### 2.1 Current Pattern (Manual Casting)

Saat ini, Zod schemas digunakan **hanya untuk validasi**, bukan untuk type inference di runtime:

```typescript
// Route registration
preValidation: async (req) => { req.body = CreateSchoolSchema.parse(req.body) }

// Controller
const body = req.body as CreateSchoolInput  // ← manual cast
```

**Masalah:**
- Type inference ada di level TypeScript (`CreateSchoolInput`), tapi **tidak connected** di runtime
- `req.body` tetap `any` di Fastify — cast `as CreateSchoolInput` bisa silent failure jika Zod parse gagal dan throw
- Zod parse terjadi di `preValidation`, tapi Fastify tidak tahu tipenya

### 2.2 Pending: `fastify-type-provider-zod`

Diskusi detail ada di [`docs/discussions/fastify-swagger-integration.md`](../discussions/fastify-swagger-integration.md).

Jika diintegrasikan:
```typescript
// Route registration
app.post('/', {
  schema: { body: CreateSchoolSchema, response: { 201: SchoolResponseSchema } },
}, controller.create)

// Controller — AUTO-TYPED!
const body = req.body; // ← langsung CreateSchoolInput, no cast!
```

---

## 3. Authentication & Authorization

### 3.1 Auth Flow (Phase 3 Complete)

```
Request → app.authenticate (preHandler/onRequest)
  → jwtVerify() → decoded user from JWT
  → parse X-School-ID / X-Academic-Year-ID headers
  → RoleResolver.resolve(userId, schoolId, academicYearId)
  → Inject roles[], activeSchoolId, activeAcademicYearId ke req.user + req
```

### 3.2 Authorization Options

| Guard | Status | Usage |
|-------|--------|-------|
| `app.authenticate` | ✅ Active | All 14 routes pakai ini |
| `requireRole()` | ✅ Available, ⏳ Deferred | **Tidak dipakai di routes yet** — ada di `docs/changes/1_0_4.md#follow-up-backlog` |

### 3.3 Role System Architecture

- **Table:** `roles` (5 seeds) + `user_roles` (scoped)
- **Scoping:** Global (NULL school) > School-specific > Academic Year-specific
- **Resolution:** Priority-based via `RoleResolver` (most specific first)
- **Fallback:** `users.role` column **sudah di-DROP** (Phase 5)

---

## 4. Error Handling

### 4.1 `AppError` — Business Error Class

Sudah ada dengan **23 predefined error codes**:

```typescript
AppError codes:
  VALIDATION_ERROR (400)
  UNAUTHORIZED / INVALID_CREDENTIALS / TOKEN_EXPIRED (401)
  FORBIDDEN (403)
  NOT_FOUND (404)
  ALREADY_EXISTS / STUDENT_NUMBER_ALREADY_EXISTS / NIS_ALREADY_EXISTS (409)
  STUDENT_HAS_SUBMISSIONS / STUDENT_HAS_ATTENDANCE / CLASS_HAS_STUDENTS (409)
  USER_HAS_DEPENDENTS / SCHOOL_HAS_DEPENDENTS (409)
  BUSINESS_RULE_VIOLATION (422)
  INTERNAL_ERROR (500)
```

### 4.2 `errorHandler` — Global Middleware

Handles:
- ✅ `AppError` → mapped status + code
- ✅ `ZodError` → 400
- ✅ `FastifyJwtAuthError` → 401
- ⚠️ Knex errors (code-based: `ER_DUP_ENTRY`, `CR_UNKNOWN_ERROR`, dll)
- ⚠️ Catch-all → 500 generic message

**Observasi:** Response format sudah standar: `{ statusCode, error, message, details? }`

---

## 5. Dependencies

### 5.1 Core Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastify` | `^5.0.0` | Framework |
| `@fastify/cors` | `^10.0.0` | CORS |
| `@fastify/helmet` | `^12.0.0` | Security headers |
| `@fastify/jwt` | `^9.0.0` | JWT auth |
| `@fastify/multipart` | `^10.1.0` | File uploads |
| `@fastify/static` | `^8.0.0` | Static files |
| `knex` | `^3.1.0` | Query builder |
| `mysql2` | `^3.11.0` | Database driver |
| `zod` | `^3.24.0` | Schema validation |
| `bcryptjs` | latest | Password hashing |
| `dotenv` | `^17.4.2` | Env loading |

### 5.2 Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `tsx` | `^4.19.0` | TS runner (dev + migrate) |
| `vitest` | `^4.1.10` | Test runner |
| `typescript` | `^5.6.0` | TS compiler |
| `eslint` | `^9.0.0` | Linting |
| `prettier` | `^3.3.0` | Formatting |

### 5.3 Clean Dependency State

Dari [`docs/observations/dependencies-unused.md`](dependencies-unused.md): **13 unused dependencies removed** (~492 packages). Workspace bersih.

---

## 6. Database Architecture

### 6.1 Schema

**17 migration files** (001–017):

| # | Migration | Tables |
|---|-----------|--------|
| 001 | users | `users` + indexes |
| 002 | schools | `schools` |
| 003 | academic_years | `academic_years` |
| 004 | teachers | `teachers` |
| 005 | subjects | `subjects` |
| 006 | classes | `classes` |
| 007 | students | `students` |
| 008 | class_students | Pivot: class ↔ students |
| 009 | teaching_assignments | `teaching_assignments` |
| 010 | attendance | `attendance` |
| 011 | grades | `grades` |
| 012 | assignments | `assignments` |
| 013 | submissions | `submissions` |
| 014 | refresh_tokens | `refresh_tokens` |
| 015 | roles | `roles` + 5 seed |
| 016 | user_roles | `user_roles` + data migration |
| 017 | drop_users_role | DROP `users.role` column |

**Total entities:** 14 tables (11 core + 3 auth/role)

### 6.2 Primary Key Convention

Semanya menggunakan **BIGINT UNSIGNED AUTO_INCREMENT** — bukan UUID.

```sql
-- Dari migration
id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
```

### 6.3 Development vs Testing

| Environment | Database | Driver |
|-------------|----------|--------|
| Development (`zekolah`) | MySQL | `mysql2` |
| Testing (`zekolah-test`) | MySQL | `mysql2` |
| Migration CLI | MySQL | `mysql2` |

**Tidak ada SQLite** lagi (sudah di-migrasi dari SQLite test di Phase awal).

---

## 7. Test Coverage

### 7.1 Structure

```
tests/
├── helper.ts           ← createTestApp(), closeAllApps()
├── *.test.ts           ← 14 test files (1 per route/entity)
└── (vitest config)     ← vitest.config.ts
```

### 7.2 Current Status

| Metric | Value |
|--------|-------|
| Total test files | 14 |
| Passing tests | ~188 |
| Failing tests | 1 (DELETE `/api/v1/schools/:id`) |

**Known failing test:** FK cascade issue dari seed data yang tidak membersihkan `user_roles` sebelum delete school. **Pre-existing issue, unrelated** ke role system implementation.

### 7.3 Test Strategy

- Build fresh Fastify app per test run
- Run migrations via `ensureSchema()`
- TRUNCATE all tables between tests (FK checks disabled)
- Tables truncated in FK-dependency order (submissions → … → users)

---

## 8. API Surface

### 8.1 Routes Overview

| Prefix | Feature | Endpoints | Auth Required |
|--------|---------|-----------|---------------|
| `/api/v1/ping` | Health check | 1 | ❌ |
| `/api/v1/auth` | Auth | 4 (register, login, me, logout) | Mixed |
| `/api/v1/users` | User CRUD | 5 | ✅ |
| `/api/v1/schools` | School CRUD | 5 | ✅ |
| `/api/v1/students` | Student CRUD | 6 | ✅ |
| `/api/v1/teachers` | Teacher CRUD | 6 | ✅ |
| `/api/v1/classes` | Class CRUD | 5 | ✅ |
| `/api/v1/subjects` | Subject CRUD | 5 | ✅ |
| `/api/v1/academic-years` | Academic Year CRUD | 5 | ✅ |
| `/api/v1/attendances` | Attendance | 4 | ✅ |
| `/api/v1/assignments` | Assignments | 5 | ✅ |
| `/api/v1/submissions` | Submissions | 4 | ✅ |
| `/api/v1/grades` | Grades | 4 | ✅ |
| `/api/v1/teaching-assignments` | Teaching Assignments | 5 | ✅ |

**Total endpoints:** ~65+

### 8.2 Current Validation Pattern

```typescript
// Route
app.post(
  '/',
  { preValidation: async (req) => { req.body = CreateSchoolSchema.parse(req.body) } },
  controller.create
)

// Controller
const body = req.body as CreateSchoolInput  // manual cast
```

---

## 9. Observations & Recommendations

### 9.1 Immediate Actions

| Priority | Item | Reason |
|----------|------|--------|
| **P0** | Integrate `fastify-swagger` + `swagger-ui` + `type-provider-zod` | No API docs currently |
| **P1** | Fix DELETE `/schools/:id` test | FK cascade seed data issue |
| **P2** | Implement `requireRole()` guards | Per-feature basis (deferred per 1.0.4 backlog) |

### 9.2 Future Enhancements

| Item | Status | Notes |
|------|--------|-------|
| Rate limiting (`@fastify/rate-limit`) | ❌ Not installed | Security hardening |
| Response schema standardization | ⚠️ Partial | Swagger integration phase |
| Caching layer (Redis) | ❌ Not planned | Consider for high-traffic endpoints |
| Queue (BullMQ) | ❌ Not planned | For email, file processing |
| OpenAPI export pipeline | ❌ Pending | Auto-generate client SDKs from spec |

### 9.3 Security Observations

| Check | Status |
|-------|--------|
| Helmet CSP | ✅ Enabled (prod only) |
| CORS | ✅ Configured (whitelist origins) |
| JWT auth | ✅ All routes except auth/public |
| Rate limiting | ❌ Not configured |
| Input validation | ⚠️ Zod validates, but manual cast at controller level |
| SQL injection | ✅ Using Knex parameterized queries |
| File upload limits | ✅ 5MB enforced via multipart config |

---

## 10. File Inventory Summary

| Category | Count | Location |
|----------|-------|----------|
| Routes | 14 | `src/routes/*.ts` |
| Controllers | 13 | `src/controllers/*.ts` |
| Services | 13 | `src/services/*.ts` |
| Repositories | 14 | `src/repositories/*.ts` |
| Validators (Zod) | 14 | `src/validators/*.ts` |
| Interfaces | ~10 | `src/models/interfaces/` |
| Middlewares | 2 | `src/middlewares/*.ts` |
| Utils | 3 | `src/utils/*.ts` |
| Migrations | 17 | `migrations/` |
| Tests | 14 | `tests/*.test.ts` |
| Seeds | 2 | `seeds/` |

**Total source files:** ~90+ TypeScript files

---

*Catatan: Observasi ini dibuat sebagai baseline untuk perencanaan iterasi berikutnya. Informasi akan diperbarui seiring perubahan arsitektur.*
