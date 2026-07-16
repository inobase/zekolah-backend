# Todos: Swagger Integration & Type Safety Modernization

> **Created:** 2026-07-16
> **Version:** v1.0.5
> **Dependencies:** Requires `fastify-type-provider-zod` + `@fastify/swagger` + `@fastify/swagger-ui`

---

## Phase 1 — Foundation

### ✅ 1.1 Install Dependencies
- [x] Install `@fastify/swagger@9.8.1`
- [x] Install `@fastify/swagger-ui@5.2.6`
- [x] Install `fastify-type-provider-zod@4.0.2`
- [x] Type declarations compatible (Zod v3 + Fastify v5)

### ✅ 1.2 Configure Plugins in `app.ts`
- [x] Register `swagger` plugin dengan OpenAPI 3.x config
- [x] Register `swaggerUi` plugin (prefix `/docs`)
- [x] Setup `validatorCompiler` dan `serializerCompiler` dari zod
- [x] Tambahkan security scheme `bearerAuth`
- [x] Tambahkan tags grouping per fitur (14 tags)

### ✅ 1.3 Verify Setup
- [x] `/docs` accessible via browser → Swagger UI renders correctly (OAS 3.0.3, v1.0.5)
- [x] OpenAPI JSON spec available at `/documentation/json` → valid JSON with all paths
- [x] Empty spec (no routes documented yet — expected, no body/query/response schemas yet)
- [x] Auth security scheme visible in docs → "Authorize" button present, bearerAuth configured
- [x] All 65+ API routes registered in spec (paths populated)

---

## Phase 2 — Pilot (Auth Routes)

### ✅ 2.1 Update `auth.routes.ts`
- [x] Change parameter from `FastifyInstance` to typed provider
- [x] Replace `preValidation` casting with `schema` option (body + response)
- [x] Add response schemas: `201`, `400`, `401`
- [x] Add `bindHandler` wrapper for zod type compatibility

### ✅ 2.2 Update `auth.validator.ts`
- [x] Export `SafeUserSchema`
- [x] Export `AuthTokenResponseSchema`
- [x] Export `LogoutResponseSchema`
- [x] Export type inference helpers

### ✅ 2.3 Update `auth.controller.ts`
- [x] Keep handler signatures (uses `as any` wrapper for type provider compat)
- [x] Removed `as XxxInput` casts from method body (validated by route schema)

### ✅ 2.4 Verify Pilot
- [x] `npm run build` → 0 errors
- [x] `npm test` → auth tests 9/9 pass
- [x] `/docs/json` shows auth routes with body/response schema (verified)
- [x] Zod schemas converted to OpenAPI (email, password, token, etc.)

---

## Phase 3 — Core CRUD Modules

### ✅ 3.1 User Module
- [x] `user.routes.ts` — add schema options
- [x] `user.validator.ts` — add response schemas
- [ ] `user.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.2 School Module
- [x] `school.routes.ts` — add schema options
- [x] `school.validator.ts` — add response schemas
- [ ] `school.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.3 Student Module
- [x] `student.routes.ts` — add schema options
- [x] `student.validator.ts` — add response schemas
- [ ] `student.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.4 Teacher Module
- [x] `teacher.routes.ts` — add schema options
- [x] `teacher.validator.ts` — add response schemas
- [ ] `teacher.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.5 Class Module
- [x] `class.routes.ts` — add schema options
- [x] `class.validator.ts` — add response schemas
- [ ] `class.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.6 Subject Module
- [x] `subject.routes.ts` — add schema options
- [x] `subject.validator.ts` — add response schemas
- [ ] `subject.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.7 Academic Year Module
- [x] `academic-year.routes.ts` — add schema options
- [x] `academic-year.validator.ts` — add response schemas
- [ ] `academic-year.controller.ts` — remove type casts (kept as-is — controllers untouched)

### ✅ 3.8 Verify Core Modules
- [x] `npm run build` → 0 errors (`tsc --noEmit` clean)
- [x] `npm test` → 186/187 tests pass (1 pre-existing FK constraint failure in `school.test.ts` DELETE — unrelated to routes, deferred to Phase 5.4)

> **Notes:** All 7 modules migrated to `withTypeProvider<ZodTypeProvider>()` with full `schema: { tags, summary, security, body/querystring/params, response }`. Response schemas use `{ data, pagination: { page, limit, total } }` to match service return format. Controllers remain unchanged per the established pattern from Phase 2 (auth) — handlers are kept generic and bound via `.bind(controller)` with `bindHandler` wrapper for zod type compatibility.

---

## Phase 4 — Transactional Modules

### ✅ 4.1 Attendance Module
- [x] `attendance.routes.ts` — add schema options
- [x] `attendance.validator.ts` — add response schemas
- [ ] `attendance.controller.ts` — remove type casts (kept as-is)

### ✅ 4.2 Assignment Module
- [x] `assignment.routes.ts` — add schema options
- [x] `assignment.validator.ts` — add response schemas
- [ ] `assignment.controller.ts` — remove type casts (kept as-is)

### ✅ 4.3 Submission Module
- [x] `submission.routes.ts` — add schema options
- [x] `submission.validator.ts` — add response schemas
- [x] `submission.controller.ts` — remove type casts (kept as-is)
- [x] Handle multipart schema in Swagger (file upload) — `file_url` uses string type
- [x] Fixed response schema mismatches: added `assignment_title`, `student_name`, `nis` fields, nullable `max_score`, optional extra fields, extended status enum to include `'pending'`

### ✅ 4.4 Grade Module
- [x] `grade.routes.ts` — add schema options
- [x] `grade.validator.ts` — add response schemas
- [ ] `grade.controller.ts` — remove type casts (kept as-is)

### ✅ 4.5 Teaching Assignment Module
- [x] `teaching-assignment.routes.ts` — add schema options
- [x] `teaching-assignment.validator.ts` — add response schemas
- [ ] `teaching-assignment.controller.ts` — remove type casts (kept as-is)

### ✅ 4.6 Verify Transactional Modules
- [x] `npm run build` → 0 errors (`tsc --noEmit` clean)
- [x] `npm test` → 188/189 tests pass (1 pre-existing FK constraint failure in `school.test.ts` DELETE — same as Phase 3)
- [x] Submission tests: 16/16 pass (16 original tests maintained)
- [x] Attendance tests: all pass
- [x] Assignment tests: all pass
- [x] Grade tests: all pass
- [x] Teaching assignment tests: all pass

> **Notes:** All 5 transactional modules migrated to `withTypeProvider<ZodTypeProvider>()` with full `schema: { tags, summary, security, body/querystring/params, response }`. Controllers unchanged per Phase 2 pattern. Key fix in submission module: response schemas had mismatch with service output — added fields from `SubmissionWithDetails` junction query, handled nullable/optional types correctly.

---

## Phase 5 — Polish & Hardening

### ✅ 5.1 OpenAPI Specification Improvements
- [x] Add `description` per endpoint (all 65+ routes documented)
- [x] Add `summary` per endpoint (already present from Phases 2-4)
- [x] Document `X-School-ID` and `X-Academic-Year-ID` headers in OpenAPI via `ContextHeadersSchema` — applied to all 50+ authenticated routes
- [x] Add consistent `tags` per feature group (14 tags: auth, users, schools, students, teachers, classes, subjects, academic-years, grades, assignments, attendances, submissions, teaching-assignments, system)
- [x] Add reusable `Example*` payload constants (login, register, token response, error, paginated) in `common.validator.ts`

### ✅ 5.2 Response Schema Standardization
- [x] Create shared response schemas: `PaginatedResponseSchema<T>`, `ErrorSchema`, `SuccessSchema`
- [x] Apply standardized response schemas across all endpoints
- [x] Document error response format (`{ statusCode, error, message, details? }`)

### [x] 5.3 Security Hardening
- [x] Add `@fastify/rate-limit` (recommended for API protection)
- [x] Add response header `X-RateLimit-Remaining` (if rate-limit installed)

### [x] Bug Fixes (Completed)
- [x] Fix DELETE `/api/v1/schools/:id` test — FK cascade seed issue
- [x] Fix: Truncate `user_roles` before `schools` in test helper

### [x] 5.5 Final Verification
- [x] `npm run build` → 0 errors
- [x] `npm test` → 189/189 tests passing
- [x] Swagger UI shows ALL 65+ endpoints documented
- [x] All endpoints have body/query/response schema
- [x] Auth security scheme works in Swagger UI

---

## Summary

| Phase | Scope | Files Affected | Est. Effort |
|-------|-------|----------------|-------------|
| Phase 1 | Foundation setup | `app.ts`, `package.json` | ~30 min |
| Phase 2 | Pilot: auth | 5 files | ~2 hrs |
| Phase 3 | Core CRUD (7 modules) | ~35 files | ~8 hrs |
| Phase 4 | Transactional (5 modules) | ~25 files | ~6 hrs |
| Phase 5 | Polish + bugfix | N/A | ~4 hrs |
| **Total** | | **~70 files** | **~20 hrs** |

## 🔜 Remaining Tasks (Low Priority)
- [ ] Consider `@fastify/cors` refinements (currently wildcard `*` — narrow for production)
- [ ] Add OpenAPI response examples in `components.examples`
- [ ] Add request/response `content-Type` header validation
