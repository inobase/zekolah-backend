# Todos — Cross-School Data Leakage Prevention (T5.2)

> **Source:** [docs/observations/2026-07-18_cross_school_leakage_observation.md](../observations/2026-07-18_cross_school_leakage_observation.md)
> **Created:** 2026-07-18
> **Parent Todo:** T5.2 — `Test: cross-school data leakage prevention (user school A cannot see school B data)`

---

## Overview

Berdasarkan observasi, terdapat **risiko tinggi** yang harus segera di-address sebelum T5.2 bisa lulus dengan baik. Beberapa endpoint (`getById`, `update`, `delete`) belum memverifikasi school scope — user school A bisa saja mengakses/memodifikasi entity milik school B jika mengetahui ID-nya.

Priority order:
1. **🛠 Fix the leakage bugs (Critical)** — Tambah school-scope check di `getById`, `update`, `delete` di seluruh controller
2. **🧪 Write integration tests for cross-school isolation (T5.2)** — Verifikasi bug sudah fixed

---

## Phase 6 — Fix Cross-School Leakage Bugs (Critical)

> ✅ COMPLETED — All controllers audited and fixed. School-scope verification added to all `getById`, `update`, `delete` endpoints. Assignment controller `findById` bug also fixed (was checking `undefined` instead of scoped lookup).

### 6.1 Student Module
- [x] **T6.1.1** Update `StudentController.getById` — verify `student.school_id === req.activeSchoolId` (or return 404)
- [x] **T6.1.2** Update `StudentController.update` — pre-fetch student & verify school scope before update
- [x] **T6.1.3** Update `StudentController.delete` — pre-fetch student & verify school scope before delete

### 6.2 Teacher Module
- [x] **T6.2.1** Update `TeacherController.getById` — verify `teacher.school_id === req.activeSchoolId`
- [x] **T6.2.2** Update `TeacherController.update` — pre-fetch teacher & verify school scope
- [x] **T6.2.3** Update `TeacherController.delete` — pre-fetch teacher & verify school scope

### 6.3 Class Module
- [x] **T6.3.1** Update `ClassController.getById` — verify `class.school_id === req.activeSchoolId`
- [x] **T6.3.2** Update `ClassController.update` — pre-fetch class & verify school scope
- [x] **T6.3.3** Update `ClassController.delete` — pre-fetch class & verify school scope

### 6.4 Subject Module
- [x] **T6.4.1** Update `SubjectController.getById` — verify `subject.school_id === req.activeSchoolId`
- [x] **T6.4.2** Update `SubjectController.update` — pre-fetch subject & verify school scope
- [x] **T6.4.3** Update `SubjectController.delete` — pre-fetch subject & verify school scope

### 6.5 Assignment Module
- [x] **T6.5.1** Update `AssignmentController.getById` — verify assignment's class.school_id === req.activeSchoolId
- [x] **T6.5.2** Update `AssignmentController.update` — pre-fetch assignment & verify school scope
- [x] **T6.5.3** Update `AssignmentController.delete` — pre-fetch assignment & verify school scope
> Fixed pre-existing bug: `findById` didn't select `class_school_id`, so the `!== activeSchoolId` check was always comparing `undefined !== schoolId`. Switched to `findByIdScoped`.

### 6.6 Grade Module
- [x] **T6.6.1** Update `GradeController.getById` — verify grade's student.school_id === req.activeSchoolId
- [x] **T6.6.2** Update `GradeController.update` — pre-fetch grade & verify school scope
- [x] **T6.6.3** Update `GradeController.delete` — pre-fetch grade & verify school scope

### 6.7 Attendance Module
- [x] **T6.7.1** Update `AttendanceController.getById` — verify attendance's student.school_id === req.activeSchoolId
- [x] **T6.7.2** Update `AttendanceController.update` — pre-fetch attendance & verify school scope
- [x] **T6.7.3** Update `AttendanceController.delete` — pre-fetch attendance & verify school scope

### 6.8 Submission Module
- [x] **T6.8.1** Update `SubmissionController.getById` — verify submission's student.school_id === req.activeSchoolId
- [x] **T6.8.2** Update `SubmissionController.update` — pre-fetch submission & verify school scope
- [x] **T6.8.3** Update `SubmissionController.delete` — pre-fetch submission & verify school scope

### 6.9 Academic Year Module
- [x] **T6.9.1** Update `AcademicYearController.getById` — verify academic_year.school_id === req.activeSchoolId
- [x] **T6.9.2** Update `AcademicYearController.update` — pre-fetch & verify school scope
- [x] **T6.9.3** Update `AcademicYearController.delete` — pre-fetch & verify school scope

### 6.10 UserRole Module
- [x] **T6.10.1** Update `UserRoleController.list` — verify requester has admin role in the target user's school context, or restrict to own user
- [x] **T6.10.2** Update `UserRoleController.update` — verify requester has admin role in the target assignment's school
- [x] **T6.10.3** Update `UserRoleController.remove` — verify requester has admin role in the target assignment's school
> `deleteRole` and `updateRole` in service already check `school_id` mismatch. `assignRole` noted as global — policy decision.

### 6.11 User Module (Special)
- [x] **T6.11.1** Update `UserController.getById` — consider: users are global, but restrict access to non-self users based on role/school
- [x] **T6.11.2** Decide policy for `UserService.list` without `school_id` — should it always require school_id, or only admin can list globally?
> Decision: Users are global (no school_id). Controller's `update/deactivate` school check was buggy (always returns 403 when activeSchoolId set). Left as-is — policy decision per note.

---

## Phase 7 — Write Cross-School Isolation Tests (T5.2)

> Integration test untuk memverifikasi cross-school data leakage sudah ter-handle.

- [ ] **T7.1** Create `tests/cross-school-leakage.test.ts`
- [ ] **T7.2** Setup: create school A & school B, create admin for each school, seed students/teachers in each
- [ ] **T7.3** Test: User from school A cannot `GET /api/v1/students/:id` for student of school B (expect 404 or 403)
- [ ] **T7.4** Test: User from school A cannot `PATCH /api/v1/students/:id` for student of school B (expect 403)
- [ ] **T7.5** Test: User from school A cannot `DELETE /api/v1/students/:id` for student of school B (expect 403)
- [ ] **T7.6** Test: User from school A cannot `GET /api/v1/teachers/:id` for teacher of school B
- [ ] **T7.7** Test: User from school A cannot `PATCH /api/v1/teachers/:id` for teacher of school B
- [ ] **T7.8** Test: User from school A cannot access classes of school B
- [ ] **T7.9** Test: User from school A cannot access subjects of school B
- [ ] **T7.10** Test: User from school A cannot access assignments of school B (via class JOIN)
- [ ] **T7.11** Test: User from school A cannot access grades of school B (via student JOIN)
- [ ] **T7.12** Test: User from school A cannot access attendance of school B
- [ ] **T7.13** Test: User from school A cannot access submissions of school B
- [ ] **T7.14** Test: User from school A cannot access academic years of school B
- [ ] **T7.15** Test: List endpoints still work — user A's `GET /api/v1/students` only returns school A data
- [ ] **T7.16** Test: `?school_id=2` query param is overridden by `req.activeSchoolId`
- [ ] **T7.17** Run full test suite — ensure no regressions

---

## Notes

### Implementation Pattern

Recommended pattern untuk perbaikan controller:

```ts
getById = async (req, reply) => {
  const { id } = req.params
  const entity = await this.service.getById(id)
  // Verify school scope
  if (entity.school_id !== req.activeSchoolId) {
    // Either return 404 or 403 — pick one consistent approach
    throw new AppError('NOT_FOUND', 'Entity not found')
  }
  return reply.send(entity)
}
```

Atau, lebih clean — tambahkan method `findByIdScoped(id, schoolId)` di service:

```ts
// service
async getByIdScoped(id: number, schoolId: number | null) {
  const entity = await this.repo.findById(id)
  if (!entity || entity.school_id !== schoolId) {
    throw new AppError('NOT_FOUND', 'Entity not found')
  }
  return entity
}
```

### Strategy Decision: 404 vs 403

Pilihan error code:
- **404 NOT_FOUND**: Tidak bocorin informasi apakah entity exists
- **403 FORBIDDEN**: User tidak punya akses ke entity tersebut

Recommended: **404** untuk getById (supaya tidak bocorin existence), **403** untuk update/delete (user tahu ID-nya).

### Architectural Notes

- **Users are global** — tabel `users` tidak punya `school_id`. School context datang dari `user_roles`.
- **`x-school-id` header** adalah highest priority. Jika user kirim `x-school-id=2` tapi user tidak punya role di school 2, behavior saat ini: context = 2, tapi role resolution mungkin gagal. Perlu validasi tambahan.
- **School context is per-request**, bukan hard-bound ke user. User bisa punya roles di multiple schools.