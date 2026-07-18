# Observations: SchoolController T1.13 & userRole OpenAPI Routes

> **Date:** 2026-07-18
> **Related Tickets:** T1.13 (SchoolController multi-tenant), userRole OpenAPI compliance

---

## 1. T1.13 — SchoolController Multi-Tenant List Logic

### Current State

**File:** [`src/controllers/school.controller.ts`](../../src/controllers/school.controller.ts)

The `SchoolController.list` method delegates to `SchoolService.list(filter)` with no school-context filtering whatsoever:

```typescript
list = async (req: FastifyRequest, reply: FastifyReply) => {
  const filter = req.query as SchoolFilterInput
  const result = await this.service.list(filter)
  return reply.send(result)
}
```

**`SchoolService.list`** ([`src/services/school.service.ts`](../../src/services/school.service.ts)) does NOT accept or apply a `school_id` filter:

```typescript
async list(filter: SchoolFilterInput): Promise<{...}> {
  const { page, limit, search, status } = filter
  // No school_id resolution — lists ALL schools system-wide
  const [data, total] = await Promise.all([
    this.repo.findAll({ search, status, limit, offset }),
    this.repo.count({ search, status }),
  ])
  return { data, pagination: { page, limit, total } }
}
```

**`SchoolRepository.findAll`** ([`src/repositories/school.repository.ts`](../../src/repositories/school.repository.ts)) also has no `school_id` parameter — the `schools` table is a top-level entity not scoped to any school.

### Issue Analysis

The `schools` table is fundamentally different from other entities (students, teachers, classes, etc.):
- Schools are the **tenant boundary**, not scoped **within** a tenant.
- A school record cannot have a `school_id` column — that would be self-referential and semantically incorrect.
- Therefore, `school_id` filtering via repository query is **not applicable**.

### Proposed Implementation Strategy

Since repository-level `school_id` filtering doesn't apply, the isolation must happen at the **controller/service layer** using role-based logic:

1. **Detect user role** from JWT payload or DB lookup within the `list` method.
2. **If user is `admin` or `super_admin`**: return all schools (current behavior).
3. **If user is school-scoped** (e.g., `teacher`, `student`, `staff`): filter to only schools where the user has an active role assignment.

This requires:
- **Controller layer** (`SchoolController.list`): inject role-check logic. Access `req.user.id` and check roles via `UserRoleRepository.findScoped(req.user.id, req.activeSchoolId)`.
- **Service layer** (`SchoolService.list`): accept an optional `allowedSchoolIds: number[]` parameter to restrict results.
- **Repository layer**: already supports `WHERE id IN (...)` via the existing `findAll` method — no schema changes needed.

### Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Filter mechanism | `WHERE id IN (allowedSchoolIds)` | No `school_id` column on `schools` table |
| Role detection | DB query in controller (not cached) | Simple; avoids circular dependency with UserRoleService |
| Admin bypass | `admin`/`super_admin` roles bypass filter | System-level admins manage all schools |
| Unknown/unauthenticated | Default to all schools (backward compat) | Graceful degradation |

### Implementation Steps

1. Update `SchoolRepository.findAll` to accept optional `ids?: number[]` filter.
2. Update `SchoolService.list` to accept optional `allowedSchoolIds?: number[]`.
3. Update `SchoolController.list` to:
   - Resolve user roles via `UserRoleRepository.findScoped(user.id, schoolId?)`
   - Extract allowed school IDs from role assignments
   - Pass to service
4. Update [`school.routes.ts`](../../src/routes/school.routes.ts) to pass `req` to controller (already does via `bindHandler`).
5. Add test case in tests file: school-scoped user sees only their school; admin sees all.

### Dependencies

- Requires `UserRoleRepository.findScoped()` to return role + school_id mapping. Verify this method exists (Phase 3).
- May need to handle the case where a user has roles across multiple schools.

---

## 2. userRole Routes — Missing OpenAPI/Swagger Schema

### Current State

**File:** [`src/routes/userRole.routes.ts`](../../src/routes/userRole.routes.ts)

All 6 endpoints are registered using the **old pattern** — anonymous arrow functions with raw `FastifyRequest`/`FastifyReply` types, no Zod schemas, no OpenAPI metadata:

```typescript
app.get(
  '/me/roles',
  { preValidation: [app.authenticate] },
  async (req: FastifyRequest, reply: FastifyReply) => {
    return controller.listMyRoles(req, reply)
  }
)
```

Compare against the **standard pattern** used in [`src/routes/user.routes.ts`](../../src/routes/user.routes.ts) and [`src/routes/school.routes.ts`](../../src/routes/school.routes.ts):

```typescript
app.withTypeProvider<ZodTypeProvider>().get(
  '/',
  {
    onRequest: [app.authenticate],
    schema: {
      tags: ['users'],
      summary: 'List all users',
      description: 'Returns paginated list...',
      security: [{ bearerAuth: [] }],
      headers: ContextHeadersSchema,
      querystring: UserFilterSchema,
      response: { 200: PaginatedUsersResponseSchema },
    },
  },
  bindHandler(controller.list.bind(controller))
)
```

### Gap Analysis

| Aspect | user.routes.ts (Standard) | userRole.routes.ts (Current) | Status |
|--------|--------------------------|------------------------------|--------|
| `withTypeProvider<ZodTypeProvider>()` | Yes | **No** | Missing |
| `onRequest: [app.authenticate]` | Yes | `preValidation: [app.authenticate]` | Different key |
| `schema.tags` | Present | **Missing** | Missing |
| `schema.summary` | Present | **Missing** | Missing |
| `schema.description` | Present | **Missing** | Missing |
| `schema.security` | Present | **Missing** | Missing |
| `schema.headers` (ContextHeadersSchema) | Present | **Missing** | Missing |
| `schema.querystring` | Present (where applicable) | **Missing** | Missing |
| `schema.response` (200/201/204) | Present | **Missing** | Missing |
| `schema.params` | Present (where applicable) | **Missing** | Missing |
| `schema.body` | Present (where applicable) | **Missing** | Missing |
| `bindHandler(controller.method.bind(controller))` | Yes | Inline arrow function | Different pattern |

### Endpoints Requiring Schema Updates

| Route | Method | Body Schema | Params Schema | Query Schema | Response Schema |
|-------|--------|-------------|---------------|--------------|-----------------|
| `/me/roles` | GET | — | — | `RoleAssignmentFilter` | Needs `RoleAssignmentListResponse` |
| `/me/context` | GET | — | — | — | Needs `ContextListResponse` |
| `/users/:id/roles` | POST | `AssignUserRoleBody` | `UserIdParamSchema` | — | Needs `RoleAssignmentResponse` |
| `/users/:id/roles` | GET | — | `UserIdParamSchema` | `RoleAssignmentFilter` | Needs `RoleAssignmentListResponse` |
| `/user-roles/:roleId` | PATCH | `UpdateRoleInput` | `RoleIdParamSchema` | — | Needs `RoleAssignmentResponse` |
| `/user-roles/:roleId` | DELETE | — | `RoleIdParamSchema` | — | Needs `DeleteResponse` |

### Required New Schemas

Need to add to [`src/validators/role-assignment.validator.ts`](../../src/validators/role-assignment.validator.ts):

```typescript
// New Zod response schemas for OpenAPI
export const RoleAssignmentResponseSchema = z.object({
  message: z.string().optional(),
  data: z.object({
    id: z.number(),
    user_id: z.number(),
    role_id: z.number(),
    school_id: z.number().nullable(),
    academic_year_id: z.number().nullable(),
    is_active: z.boolean(),
    assigned_by: z.number().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    role: z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().nullable(),
    }).nullable().optional(),
  }),
})

export const RoleAssignmentListResponseSchema = z.object({
  message: z.string().optional(),
  data: z.array(/* RoleAssignment schema */),
})

export const ContextListResponseSchema = z.object({
  message: z.string().optional(),
  data: z.array(z.object({
    school_id: z.number(),
    school_name: z.string(),
    academic_year_id: z.number().nullable(),
    academic_year: z.string().nullable(),
    roles: z.array(z.object({ id: z.number(), name: z.string() })),
  })),
})

// Param schemas
export const RoleIdParamSchema = z.object({
  roleId: z.string().regex(/^\d+$/).transform(Number),
})
```

### Implementation Steps

1. Add response/param schemas to `role-assignment.validator.ts`.
2. Refactor `userRole.routes.ts`:
   - Add `ZodTypeProvider` import and `withTypeProvider<ZodTypeProvider>()`.
   - Replace `{ preValidation: [app.authenticate] }` with `{ onRequest: [app.authenticate], schema: {...} }`.
   - Add `tags: ['roles']` (or `'user-roles'`).
   - Add `summary`, `description`, `security`, `headers`, `body`, `params`, `querystring`, `response` per endpoint.
   - Switch from inline arrows to `bindHandler(controller.method.bind(controller))`.
3. Run `tsc --noEmit` to verify type safety.
4. Verify Swagger UI renders all endpoints with proper schemas.

### Reference Files

- **Standard route pattern:** [`src/routes/user.routes.ts`](../../src/routes/user.routes.ts)
- **Standard route pattern:** [`src/routes/school.routes.ts`](../../src/routes/school.routes.ts)
- **Validator pattern:** [`src/validators/user.validator.ts`](../../src/validators/user.validator.ts)
- **Response schemas:** [`src/validators/school.validator.ts`](../../src/validators/school.validator.ts)
