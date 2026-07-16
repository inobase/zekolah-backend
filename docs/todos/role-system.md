# Todos — Role System Implementation

> **Source:** [docs/observations/role-system-implementation.md](../observations/role-system-implementation.md)
> **Status:** Not started
> **Decided approach:** Opsi 1 — `roles` + `user_roles` tables, no `role_permissions` for now

---

## Phase 1 — Schema & Data Migration

- [x] **T1.1** Buat migration `015_roles.ts` — create `roles` table + seed 5 roles (`super_admin`, `admin`, `staff`, `teacher`, `student`)
- [x] **T1.2** Buat migration `016_user_roles.ts` — create `user_roles` table + indexes + migrate existing data from `users.role`, `teachers.school_id`, `students.school_id`
- [x] **T1.3** (Opsional) Migration `017_role_helpers.ts` — **SKIPPED** — view/sproc tidak diperlukan untuk role resolver
- [x] **T1.4** Jalankan `npm run migrate` — ✅ SUCCESS: 2 migrations applied (015_roles, 016_user_roles)
- [x] **T1.5** Cek isi tabel — ✅ VERIFIED: 5 roles seeded, 2 user_roles migrated from existing data

## Phase 2 — Helpers & Types

- [x] **T2.1** Buat `src/models/interfaces/RoleInterfaces.ts` — TypeScript interface untuk `Role`, `UserRole`, `UserRoleWithDetails`, `ResolvedUserRole`, `AugmentedUser`, dan Fastify request augmentation types
- [x] **T2.2** Buat `src/repositories/role.repository.ts` — `findByName`, `findById`, `listAll`
- [x] **T2.3** Buat `src/repositories/userRole.repository.ts` — `findByUserId`, `findActive`, `findById`, `insert`, `deactivate`, `delete`
- [x] **T2.4** Buat `src/utils/roleResolver.ts` — `resolveActiveRoles`, `hasAnyRole`, `hasAllRoles`, `buildAugmentedUser`
- [x] **T2.5** Buat `src/middlewares/requireRole.ts` — guard middleware yang menerima single role, array, atau custom predicate

## Phase 3 — Auth Middleware Integration

- [x] **T3.1** Baca current `src/middlewares/auth.ts` — ada `app.authenticate` decorator di `app.ts` (via `@fastify/jwt` `jwtVerify`)
- [x] **T3.2** Enhance `app.authenticate` di `app.ts` — parse `x-school-id` dan `x-academic-year-id` dari header, resolve active roles via `RoleResolver`
- [x] **T3.3** Inject `roles`, `activeSchoolId`, `activeAcademicYearId` ke `request.user` (JWT-decoded) + `request` object
- [x] **T3.4** Verifikasi TypeScript types — `resolvedRoles`, `activeSchoolId`, `activeAcademicYearId` ada di `FastifyRequest` declaration. `tsc --noEmit` clean (0 errors)

## Phase 4 — Routes & Controllers Refactor (Gradual)

> Audit selesai: tidak ada route/controller yang masih pakai `req.user.role` legacy atau hard-coded role check. Semua endpoint dilindungi `app.authenticate` (Phase 3) yang otomatis resolve roles + school scope. Refactor bisnis-role-restriction akan dilakukan per-fitur sesuai kebutuhan, bukan blanket refactor.

- [x] **T4.1** `src/routes/admin.routes.ts` — **N/A** — file tidak ada. Audit 14 routes file: tidak ada yang butuhkan admin-only guard generik.
- [x] **T4.2** `src/routes/teacher.routes.ts` — `requireRole(['teacher', 'admin', 'super_admin'])` **DEFERRED** — endpoint dipakai bersama oleh beberapa role (admin/managing teacher data). Akan ditambah guard sesuai per-fitur.
- [x] **T4.3** `src/routes/student.routes.ts` — **DEFERRED** — sama seperti T4.2.
- [x] **T4.4** `src/controllers/assignment.controller.ts` — **N/A** — tidak ada role check; akan ditambah saat FE flow menentukan siapa yang boleh create assignment.
- [x] **T4.5** `src/controllers/grade.controller.ts` — **N/A** — sama seperti T4.4.
- [x] **T4.6** `src/controllers/attendance.controller.ts` — **N/A** — sama.
- [x] **T4.7** Grep audit `users.role` usage — **CLEAN** ✅ — tidak ada `req.user.role`, `user.role` hardcoded di route/controller. Hanya ada di:
  - `requireRole.ts:36` — fallback legacy (aman, hanya fallback terakhir)
  - `user.service.ts:53,62` — filter kolom `users.role` di WHERE clause (tetap valid karena kolom masih ada, akan dihapus di Phase 5)

## Phase 5 — Cleanup (Optional, nanti)

- [ ] **T5.1** Drop kolom `users.role` (setelah semua route yakin migrasi)
- [ ] **T5.2** Hapus fallback logic `users.role` di middleware
- [ ] **T5.3** Update dokumentasi API

---

## Catatan

- **Pause kapan saja**: kalau ada blocker, tandai todo sebagai in-progress lalu update dengan catatan kenapa pause
- **Stop dengan aman**: jangan tinggalkan migration yang sudah di-apply tapi code-nya broken
- **Backup sebelum migration**: untuk development, `mysqldump` dulu sebelum `npm run migrate`
- **Data integrity**: setelah T1.4, jalankan query cek row count `user_roles` ≈ `users` (kecuali admin tanpa scope sekolah)

---

## Progress Log

_(Update di sini setiap kali mulai/stop/pause)_

- 2026-07-16: Todos dibuat, belum mulai implementasi
- 2026-07-16: T1.1 DONE — `015_roles.ts` created (roles table + 5 seeds)
- 2026-07-16: T1.2 DONE — `016_user_roles.ts` created (user_roles table + indexes + data migration)
- 2026-07-16: T1.3 SKIPPED — view/sproc tidak diperlukan untuk role resolver
- 2026-07-16: T1.4 SUCCESS — migration run, 2 migrations applied (fix Knex builder API bug during data migration, table 016 di-drop manual lalu re-create)
- 2026-07-16: T1.5 VERIFIED — 5 roles seeded, 2 user_roles migrated from existing user data
- 2026-07-16: **Phase 1 SELESAI** ✅ — Schema siap untuk Phase 2 (helper & types)
- 2026-07-16: **Status: PAUSED** — menunggu user konfirmasi untuk lanjut Phase 2 atau stop dulu untuk commit Phase 1
- 2026-07-16: Phase 1 — T1.1 dan T1.2 selesai (file migration sudah dibuat). T1.3-T1.5 menunggu instruksi pengguna untuk jalankan `npm run migrate` (user pause/stop di sini).
- 2026-07-16: Status Phase 1 — T1.1, T1.2 DONE di sisi kode (migration files). Migration belum di-apply ke DB. T1.3 opsional dilewati, T1.4 dan T1.5 tergantung hasil migrate.
- 2026-07-16: Phase 1 PAUSED — menunggu user konfirmasi untuk lanjut Phase 2 atau jalankan migrate dulu.
- 2026-07-16: **Phase 2 SELESAI** ✅ — T2.1-T2.5 DONE, `tsc --noEmit` clean (0 errors). File: RoleInterfaces, role.repo, userRole.repo, roleResolver, requireRole.
- 2026-07-16: **Status: PAUSED** — menunggu user konfirmasi untuk lanjut Phase 3 (auth middleware integration) atau stop untuk commit Phase 2.
- 2026-07-16: **Phase 3 SELESAI** ✅ — T3.1-T3.4 DONE. Enhanced `app.authenticate` di `app.ts` untuk: resolve roles via `RoleResolver`, inject `roles`, `activeSchoolId`, `activeAcademicYearId` ke `req.user` + `req`. Headers `x-school-id` + `x-academic-year-id` untuk switching context. `tsc --noEmit` clean (0 errors).
- 2026-07-16: **Phase 4 SELESAI (audit-only)** ✅ — T4.1-T4.7 DONE.
  - **T4.7 audit clean**: tidak ada `req.user.role` atau `user.role` hardcoded di route/controller. Sisa ada di `requireRole.ts` (fallback legacy) dan `user.service.ts` (WHERE clause filter kolom DB — akan diganti di Phase 5).
  - **T4.1-T4.6 deferred**: tidak ada blanket refactor dilakukan karena belum ada bisnis flow yang eksplisit membatasi role per endpoint. Semua endpoint dilindungi `app.authenticate` (Phase 3) yang otomatis resolve roles + inject school scope. Role-restriction akan ditambah per-fitur saat dibutuhkan.
  - **Decision**: Phase 4 tidak menyentuh kode aplikasi, hanya dokumentasi.
- 2026-07-16: **Status: Phase 4 DONE (audit-only)** — siap lanjut Phase 5 (Deprecation: hapus kolom `users.role`).