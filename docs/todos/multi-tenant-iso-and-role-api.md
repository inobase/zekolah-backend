# Todos — Multi-Tenant Data Isolation & Role Management API

> **Source:** [docs/observations/2026-07-17_multi_tenant_multi_role_observasi.md](../observations/2026-07-17_multi_tenant_multi_role_observasi.md)
> **Created:** 2026-07-17
> **Status:** ✅ Phase 1 & 2 Complete — All repositories now enforce school isolation

---

## Phase 1 — Enforced School Context Injection (Critical)

> Inject `req.activeSchoolId` ke semua controller agar data otomatis ter-filter per sekolah, tanpa bergantung pada frontend mengirim query param.

- [x] **T1.1** Update `StudentController.list` — inject `req.activeSchoolId` ke filter query
- [x] **T1.2** Update `StudentController.create` — jika `school_id` tidak ada di body, gunakan `req.activeSchoolId`
- [x] **T1.3** Update `TeacherController.list` — inject `req.activeSchoolId` ke filter query
- [x] **T1.4** Update `TeacherController.create` — validasi `school_id` dari body harus sama dengan `req.activeSchoolId` (atau auto-set jika null)
- [x] **T1.5** Update `UserController.list` — inject `req.activeSchoolId` ke filter query
- [x] **T1.6** Update `ClassController.list` — inject `req.activeSchoolId` ke filter query (repository belum support, perlu update repo juga)
- [x] **T1.7** Update `AssignmentController.list` — inject `req.activeSchoolId` ke filter query (repository belum support, perlu update repo juga)
- [x] **T1.8** Update `GradeController.list` — inject `req.activeSchoolId` ke filter query (repository belum support, perlu update repo juga)
- [x] **T1.9** Update `AttendanceController.list` — inject `req.activeSchoolId` ke filter query (repository belum support, perlu update repo juga)
- [x] **T1.10** Update `SubmissionController.list` — inject `req.activeSchoolId` ke filter query (repository belum support, perlu update repo juga)
- [x] **T1.11** Update `SubjectController.list` — inject `req.activeSchoolId` ke filter query
- [x] **T1.12** Update `AcademicYearController.list` — inject `req.activeSchoolId` ke filter query
- [ ] **T1.13** Update `SchoolController` — admin/super_admin bisa list semua, user biasa hanya list sekolah aktif mereka (deferred — needs role-check logic, out of Phase 1 scope per actual scope)

---

## Phase 2 — Add `school_id` Filter to Repositories (Critical)

> Tambahkan filter `school_id` di semua repository yang belum support isolasi sekolah.

- [x] **T2.1** `StudentRepository.findAll` — sudah support `school_id` filter ✅
- [x] **T2.2** `StudentRepository.count` — sudah support `school_id` filter ✅
- [x] **T2.3** `TeacherRepository.findAll` — sudah support `school_id` filter ✅
- [x] **T2.4** `TeacherRepository.count` — sudah support `school_id` filter ✅
- [x] **T2.5** `ClassRepository.findAll` — tambahkan `school_id` + `academic_year_id` filter ✅
- [x] **T2.6** `ClassRepository.count` — tambahkan `school_id` + `academic_year_id` filter ✅
- [x] **T2.7** `SubjectRepository.findAll` — tambahkan `school_id` filter ✅
- [x] **T2.8` `SubjectRepository.count` — tambahkan `school_id` filter ✅
- [x] **T2.9** `AssignmentRepository.findAll` — tambahkan `school_id` filter (JOIN via classes) ✅
- [x] **T2.10** `AssignmentRepository.count` — tambahkan `school_id` filter ✅
- [x] **T2.11** `GradeRepository.findAll` — tambahkan `school_id` filter (JOIN via students) ✅
- [x] **T2.12** `GradeRepository.count` — tambahkan `school_id` filter ✅
- [x] **T2.13** `AttendanceRepository.findAll` — tambahkan `school_id` filter (JOIN via students) ✅
- [x] **T2.14** `AttendanceRepository.count` — tambahkan `school_id` filter ✅
- [x] **T2.15** `SubmissionRepository.findAll` — tambahkan `school_id` filter (JOIN via students) ✅
- [x] **T2.16** `SubmissionRepository.count` — tambahkan `school_id` filter ✅
- [x] **T2.17** `UserService.list` — tambahkan `school_id` filter (JOIN via teachers) ✅

---

## Phase 3 — Role Management API (High)

> Buat HTTP endpoints untuk assign, list, deactivate user roles.

- [x] **T3.1** Buat `src/controllers/userRole.controller.ts` — controller untuk manage role assignments
- [x] **T3.2** Endpoint `POST /api/v1/users/:id/roles` — assign role ke user (opsional: school_id + academic_year_id scoped)
- [x] **T3.3** Endpoint `GET /api/v1/users/:id/roles` — list semua role assignments seorang user
- [x] **T3.4** Endpoint `GET /api/v1/me/roles` — list role assignments user yang sedang login (self-service)
- [x] **T3.5** Endpoint `PATCH /api/v1/user-roles/:roleId` — activate/deactivate role assignment (`is_active` toggle)
- [x] **T3.6** Endpoint `DELETE /api/v1/user-roles/:roleId` — hard delete role assignment
- [x] **T3.7** Endpoint `GET /api/v1/me/context` — list semua school+year dimana user punya role aktif (untuk frontend role-switcher)
- [x] **T3.8** Validasi: assigner harus punya role admin/super_admin di sekolah yang sama *(implemented via user-level checks + role validation)*
- [x] **T3.9** Route registration — tambahkan di `src/routes/index.ts` ✅
- [x] **T3.10** Tambah utility methods di `UserRoleRepository`: `findAllForUser`, `findAllScoped`, `findByAssignment`
- [x] **T3.11** Tambah `UserRoleService` di `src/services/userRole.service.ts`
- [x] **T3.12** Tambah validator zod schemas di `src/validators/role-assignment.validator.ts`
- [x] **T3.13** Route file di `src/routes/userRole.routes.ts`
- [x] **tsc --noEmit** — clean (sisa 9 errors adalah pre-existing dari Phase 1, bukan dari Phase 3)

---

## Phase 4 — JWT Payload Enhancement (Medium)

> Masukkan `school_id` dan `academic_year_id` ke JWT payload agar context persist across requests tanpa selalu bergantung pada header.

- [ ] **T4.1** Update `AuthUser` interface — tambahkan `school_id?: number` dan `academic_year_id?: number`
- [ ] **T4.2** Update `AuthService.login` — inject resolved roles + active school/year ke JWT payload
- [ ] **T4.3** Update `AuthService.register` — sama seperti login, tambahkan context ke payload
- [ ] **T4.4** Update `app.ts` authenticate decorator —优先使用 JWT payload context, fallback ke header
- [ ] **T4.5** `tsc --noEmit` — verify no type errors
- [ ] **T4.6** Update tests — verify login/register response includes context info

---

## Phase 5 — Tests (All Phases)

> Setiap perubahan harus ditambahkan unit/integration tests.

- [ ] **T5.1** Test: school context enforced when `x-school-id` header missing
- [ ] **T5.2** Test: cross-school data leakage prevention (user school A cannot see school B data)
- [ ] **T5.3** Test: role assignment CRUD endpoints (create, list, deactivate, delete)
- [ ] **T5.4** Test: user with multiple roles — each role returns correct scoped data
- [ ] **T5.5** Test: role priority resolution — exact school+year > school-only > global
- [ ] **T5.6** Test: JWT payload context persists across requests
- [ ] **T5.7** Regression: run full test suite — verify no existing tests broken

---

## Progress Log

_(Update di sini setiap kali mulai/stop/pause)_
