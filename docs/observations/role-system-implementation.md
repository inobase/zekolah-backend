# Observasi — Implementasi Role System Multi-tenant

## Tanggal Observasi
2026-07-16

## Status
Diskusi selesai di [docs/discussions/role-multi-tenant-scoped.md](discussions/role-multi-tenant-scoped.md). Dokumen ini **catatan implementasi** untuk referensi saat coding nanti.

---

## Ringkasan Keputusan

| Aspek | Keputusan |
|-------|-----------|
| Pendekatan | Opsi 1 (`roles` + `user_roles`) |
| Role hirarkis | Tidak — independen |
| Permission table | Tidak (nanti jika perlu) |
| Default role user baru | Dari `users.role`, di-link ke `user_roles` saat terkait ke teacher/student record |
| Multi-school user | Ya (teacher bisa mengajar di > 1 sekolah) |
| Seed roles | super_admin, admin, staff, teacher, student |
| `schoolId` source | Cookie (`school_id`) — fallback `NULL` |
| `academic_year_id` | Optional (`NULL` = semua TA) |
| Cross-school | Didukung via `school_id=NULL` (super_admin) atau multiple rows |

---

## Catatan Teknis

### 1. Struktur Migration

```
015_roles.ts              — Create `roles` table + seed
016_user_roles.ts         — Create `user_roles` table + migrate existing data
017_role_helpers.ts       — (Optional) Stored procedure atau view untuk resolve_active_role
```

### 2. Index & Performance

```sql
-- Paling sering di-query saat request
CREATE INDEX idx_user_roles_active
  ON user_roles (user_id, school_id, academic_year_id, is_active);

-- Untuk resolve role by name
CREATE INDEX idx_user_roles_role_name
  ON user_roles (role_id, school_id, is_active);

-- Composite untuk filter role aktif
CREATE INDEX idx_user_roles_composite
  ON user_roles (user_id, role_id, school_id, academic_year_id, is_active);
```

### 3. Pattern Resolve Active Role

```typescript
// src/utils/roleResolver.ts
export async function resolveActiveRoles(
  userId: number,
  schoolId: number | null,
  academicYearId: number | null
): Promise<string[]> {
  const query = knex('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('user_roles.user_id', userId)
    .andWhere('user_roles.is_active', true)
    .select('roles.name as role', 'user_roles.school_id', 'user_roles.academic_year_id')

  const all = await query

  return all
    .filter(r => {
      // school_id harus null atau match dengan requested school
      const schoolMatch = r.school_id === null || r.school_id === schoolId
      // academic_year_id harus null atau match dengan requested TA
      const yearMatch = r.academic_year_id === null || r.academic_year_id === academicYearId
      return schoolMatch && yearMatch
    })
    .map(r => r.role)
}
```

### 4. Auth Middleware Refactor

**Current (asumsi dari diskusi):**
```typescript
req.user = { id: user.id, role: user.role }  // single string
```

**Target:**
```typescript
req.user = {
  id: user.id,
  email: user.email,
  roles: string[],                  // multiple roles yang aktif
  activeSchoolId: number | null,
  activeAcademicYearId: number | null,
}
```

### 5. Route Guards / RBAC Helper

```typescript
// src/middlewares/requireRole.ts
export const requireRole = (role: string | string[]) => {
  const roles = Array.isArray(role) ? role : [role]
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const userRoles = req.user?.roles ?? []
    const hasRole = roles.some(r => userRoles.includes(r))
    if (!hasRole) {
      throw new AppError(403, 'INSUFFICIENT_ROLE', `Requires one of: ${roles.join(', ')}`)
    }
  }
}

// Usage:
fastify.get('/api/v1/admin/users', {
  preHandler: [requireRole(['admin', 'super_admin'])],
}, handler)
```

### 6. Data Migration Script (in 016_user_roles.ts)

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_roles', (table) => { /* ... */ })

  // Migrate existing data
  // 1. Get role IDs from roles table (just seeded in 015)
  const roleMap = await knex('roles').select('id', 'name')
  const roleIdsByName = Object.fromEntries(roleMap.map(r => [r.name, r.id]))

  // 2. Migrate teacher records
  const teachers = await knex('teachers')
    .select('user_id', 'school_id', knex.raw('NOW() as granted_at'))

  for (const t of teachers) {
    await knex('user_roles').insert({
      user_id: t.user_id,
      role_id: roleIdsByName['teacher'],
      school_id: t.school_id,
      academic_year_id: null,
      is_active: true,
      granted_at: t.granted_at,
    }).onConflict(['user_id', 'role_id', 'school_id', 'academic_year_id']).ignore()
  }

  // 3. Migrate student records
  const students = await knex('students')
    .select('user_id', 'school_id', knex.raw('NOW() as granted_at'))

  for (const s of students) {
    await knex('user_roles').insert({
      user_id: s.user_id,
      role_id: roleIdsByName['student'],
      school_id: s.school_id,
      academic_year_id: null,
      is_active: true,
      granted_at: s.granted_at,
    }).onConflict(['user_id', 'role_id', 'school_id', 'academic_year_id']).ignore()
  }

  // 4. Migrate users with role=admin (likely already migrated from teachers/students, but standalone admins)
  const admins = await knex('users')
    .where('role', 'admin')
    .select('id', knex.raw('NOW() as granted_at'))

  for (const a of admins) {
    // Check if user already has admin role in any school (from teachers/students)
    const existing = await knex('user_roles')
      .where('user_id', a.id)
      .andWhere('role_id', roleIdsByName['admin'])
      .first()

    if (!existing) {
      await knex('user_roles').insert({
        user_id: a.id,
        role_id: roleIdsByName['admin'],
        school_id: null,
        academic_year_id: null,
        is_active: true,
        granted_at: a.granted_at,
      }).onConflict().ignore()
    }
  }
}
```

### 7. TypeScript Interface (di src/models/interfaces/)

```typescript
// src/models/interfaces/RoleInterfaces.ts

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  school_id: number | null;
  academic_year_id: number | null;
  is_active: boolean;
  granted_at: string;
  granted_by: number | null;
}

export interface UserRoleWithDetails extends UserRole {
  role_name: string;             // from JOIN to roles
  school_name: string | null;    // from JOIN to schools
  academic_year: string | null;  // from JOIN to academic_years
}

// For Fastify request decoration
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      email: string;
      roles: string[];
      activeSchoolId: number | null;
      activeAcademicYearId: number | null;
    };
  }
}
```

### 8. Routes yang Perlu Dimigrasi (Gradual)

Pencarian dengan `req.user.role` (single) perlu diganti ke `req.user.roles.includes(...)`:

- [ ] `src/middlewares/auth.ts` — saat ini cek `req.user.role`
- [ ] `src/routes/admin.routes.ts` — admin-only endpoints
- [ ] `src/routes/teacher.routes.ts` — teacher-only endpoints
- [ ] `src/routes/student.routes.ts` — student-only endpoints
- [ ] `src/controllers/assignment.controller.ts` — siapa yang boleh create assignment
- [ ] `src/controllers/grade.controller.ts` — input/edit nilai

---

## Risiko yang Harus Diperhatikan

### 1. Data Migration Bug
- User yang punya role di `users.role = 'admin'` tapi sebenarnya adalah teacher → akan punya 2 row di `user_roles` (teacher + admin). Ini mungkin bug atau feature.
- Solusi: jalankan dry-run dulu, print duplicate users, minta user konfirmasi.

### 2. Cookie Trust
- `school_id` di cookie harus validasi: cek apakah user benar-benar punya akses di sekolah tersebut.
- Backend **harus re-resolve role** setiap request — jangan percaya role di JWT.

### 3. `users.role` Conflict
- Untuk sementara `users.role` dan `user_roles` bisa **saling tidak konsisten**.
- Migrasi bertahap: tambahkan fallback logic di controller (cek `user_roles` dulu, fallback `users.role`).

### 4. Multi-tenant Performance
- Query dengan `user_roles` sekarang lebih mahal (ada join). Mitigasi dengan index composite dan caching (optional).

---

## Roadmap Implementasi

### Phase 1 — Skema & Data Migration
- [ ] Migration `015_roles.ts`
- [ ] Migration `016_user_roles.ts`
- [ ] Migration `017_role_helpers.ts` (optional)
- [ ] Seed roles data

### Phase 2 — Auth Helper
- [ ] `src/utils/roleResolver.ts` — `resolveActiveRoles()`
- [ ] `src/middlewares/requireRole.ts` — guard middleware
- [ ] Update Fastify request decoration TypeScript

### Phase 3 — Middleware Integration
- [ ] Update `src/middlewares/auth.ts` — parse `school_id` cookie
- [ ] Inject active roles ke `req.user.roles`

### Phase 4 — Routes Refactor (gradual)
- [ ] Refactor satu route per commit
- [ ] Test setiap refactor

### Phase 5 — Drop `users.role` (final, opsional)
- [ ] Setelah semua route migrasi, drop kolom `users.role`
- [ ] Hapus fallback logic

---

## File yang Akan Disentuh Saat Implementasi

```
NEW:
  migrations/015_roles.ts
  migrations/016_user_roles.ts
  migrations/017_role_helpers.ts
  src/utils/roleResolver.ts
  src/middlewares/requireRole.ts
  src/models/interfaces/RoleInterfaces.ts
  src/repositories/role.repository.ts
  src/repositories/userRole.repository.ts

MODIFIED:
  src/middlewares/auth.ts
  src/app.ts (TypeScript declarations)
  src/controllers/*.controller.ts (gradual)
  src/routes/*.routes.ts (gradual)
```

---

## Estimasi Effort

- Phase 1-3: ~2-3 jam (schema, migration, auth helper)
- Phase 4: ~3-4 jam (refactor routes bertahap)
- Phase 5: ~30 menit (cleanup)

**Total: ~6-8 jam** untuk full implementation + testing.

---

## Catatan Tambahan

1. **Tidak ada `parent` role dalam seed awal** — bisa ditambahkan nanti setelah ada flow login wali murid.
2. **`staff` role** — untuk operator sekolah (TU, kepsek). Bisa create student, manage teacher, dll.
3. **`super_admin`** — punya `school_id=NULL`, role aktif di semua sekolah.
4. **Soft delete via `is_active=false`** — agar audit trail utuh, role yang di-nonaktifkan tidak hilang dari histori.

---

## Status

✅ Observasi ini siap sebagai referensi saat implementasi.

Lihat juga:
- [docs/discussions/role-multi-tenant-scoped.md](discussions/role-multi-tenant-scoped.md) — diskusi dan keputusan lengkap
- [docs/observations/dependencies-unused.md](observations/dependencies-unused.md) — observasi dependencies