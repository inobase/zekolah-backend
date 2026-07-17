# Observasi: T5.2 — Cross-School Data Leakage Prevention

> **Created:** 2026-07-18
> **Related Todo:** T5.2 `Test: cross-school data leakage prevention (user school A cannot see school B data)`

---

## 1. Arsitektur Isolasi yang Ada

### 1.1 Flow Context Injection (app.authenticate)

Lokasi: `src/app.ts` baris ~260-290

```
Header x-school-id (priority tertinggi)
    ↓ jika tidak ada
JWT payload school_id (dari AuthService.login, di-resolve dari role user)
    ↓ jika tidak ada
null (tidak ada context sekolah)
```

Hasilnya di-inject ke:
- `req.activeSchoolId` — digunakan oleh controller untuk filter query
- `req.user.activeSchoolId` — augment JWT user object
- `req.user.school_id` — di-set via `resolveAndCheckAdminAccess` (di beberapa service)

### 1.2 Pattern di Controller (Phase 1)

Semua controller mengikuti pola yang konsisten:

```ts
list = async (req, reply) => {
  const query = req.query as SomeFilterInput
  const filter = { ...query, school_id: req.activeSchoolId ?? undefined }
  return reply.send(await this.service.list(filter))
}
```

Artinya: `req.activeSchoolId` **override** query param `school_id`. Ini preventatif tapi bermasalah jika `req.activeSchoolId` salah-set.

### 1.3 Pattern di Repository (Phase 2)

- `StudentRepository.findAll` — `.where('school_id', filter.school_id)` ✅
- `TeacherRepository.findAll` — `.where('school_id', filter.school_id)` ✅
- `ClassRepository.findAll` — `.where('school_id', filter.school_id)` ✅
- `SubjectRepository.findAll` — `.where('school_id', filter.school_id)` ✅
- `AssignmentRepository.findAll` — JOIN via classes dengan `.where('classes.school_id', ...)` ✅
- `GradeRepository.findAll` — JOIN via students dengan `.where('students.school_id', ...)` ✅
- `AttendanceRepository.findAll` — JOIN via students dengan `.where('students.school_id', ...)` ✅
- `SubmissionRepository.findAll` — JOIN via students dengan `.where('students.school_id', ...)` ✅
- `UserService.list` — JOIN via teachers dengan `.where('teachers.school_id', ...)` ✅

---

## 2. Risiko Data Leakage yang Teridentifikasi

### 🚨 RISIKO TINGGI: `getById` Tidak Memverifikasi School Scope

Di hampir semua controller, metode `getById` hanya mengambil entity berdasarkan ID tanpa verifikasi school scope:

```ts
// student.controller.ts
getById = async (req, reply) => {
  const { id } = req.params
  return reply.send(await this.service.getById(id)) // NO SCHOOL CHECK
}
```

**Scenario:** User A (school 1) tahu ID student dari school 2 → bisa fetch detail student school 2.

Ini berlaku untuk:
- `StudentController.getById` — tidak cek `student.school_id === req.activeSchoolId`
- `TeacherController.getById` — tidak cek `teacher.school_id === req.activeSchoolId`
- `ClassController.getById` — tidak cek `class.school_id === req.activeSchoolId`
- `SubjectController.getById` — tidak cek `subject.school_id === req.activeSchoolId`
- `UserService.getById` — tidak cek `user` terkait school mana (users bersifat global!)

**Catatan:** `UserService.list` memang filter school via teachers, tapi `UserService.getById` tidak ada school check. Users bersifat **global** (tidak punya school_id di tabel users). Ini design intentional tapi tetap perlu perhatian.

### 🚨 RISIKO TINGGI: `StudentController.update/delete` Tidak Cek School Ownership

```ts
update = async (req, reply) => {
  const { id } = req.params
  const body = req.body
  return reply.send(await this.service.update(id, body)) // NO SCHOOL CHECK
}

delete = async (req, reply) => {
  const { id } = req.params
  await this.service.delete(id) // NO SCHOOL CHECK
}
```

**Scenario:** User A (school 1) bisa update atau delete student milik school 2 jika tahu ID-nya.

### 🚨 RISIKO MENENGAH: `UserService.list` Return Seluruh User Global

`UserService.list` saat ini:
- Jika `school_id` diberikan → JOIN via teachers, hanya return user yang punya teaching assignment di school tersebut
- Jika **tidak** diberikan `school_id` → return **semua user** tanpa filter

**Scenario:** User school 1 dengan role admin melakukan `GET /api/v1/users` → bisa melihat seluruh user dari semua school.

### ⚠️ RISIKO MENENGAH: `UserRoleController.list` Untuk User Lain Tidak Filter School

```ts
list = async (req, reply) => {
  const userId = Number(req.params.id)
  // ...
  const roles = await this.service.listRolesForUser(userId, isActive)
  // listRolesForUser tidak memfilter req.activeSchoolId
}
```

Tidak ada verfikasi bahwa requester adalah admin dari school yang sama. Siapapun yang authenticated bisa melihat role assignments user lain.

### ⚠️ RISIKO RENDAH: `GET /api/v1/me` Tidak Memverifikasi School Context

Endpoint `/me` hanya return data user berdasarkan user_id dari JWT — tidak ada school scope verification. Ini **expected** karena user adalah global entity. Tapi jika endpoint ini digunakan untuk inferensi cross-school (misalnya `me` return informasi school_id), bisa ada informasi disclosure.

---

## 3. Apa yang Sudah Benar

✅ **List endpoints hampir semua memfilter school_id** — Via `req.activeSchoolId` injection dari authenticate decorator, semua `list` methods sudah otomatis ter-filter.

✅ **Create endpoints auto-fill school_id** — Semua `create` methods otomatis mengisi `school_id` dari `req.activeSchoolId` jika tidak diberikan di body.

✅ **Repository-level filtering** — Semua repository support `school_id` filter di `findAll()` dan `count()`.

✅ **Cross-school leakage via API tidak bisa terjadi di list** — Karena `req.activeSchoolId` selalu di-override, tidak mungkin user melihat data cross-school melalui list endpoints.

✅ **Role resolution scoped** — `RoleResolver.resolve()` hanya resolve roles yang relevan dengan `activeSchoolId` dan `activeAcademicYearId` saat ini.

---

## 4. Rekomendasi Test Strategy untuk T5.2

Untuk testing cross-school data leakage prevention, buat skenario berikut dalam test suite terpisah (`tests/cross-school-leakage.test.ts`):

### Test 1: Cross-School List Prevention
- Register user A (school 1)
- Register user B (school 2)  
- Login sebagai user A → `GET /api/v1/students` → Verify hanya return data school 1
- Login sebagai user B → `GET /api/v1/students` → Verify hanya return data school 2

### Test 2: Cross-School GetById Prevention
- Login sebagai user A (school 1)
- Fetch student ID dari school 2 (atau hardcode ID)
- `GET /api/v1/students/:id` → Harus return 404 atau 403, BUKAN data school 2

### Test 3: Cross-School Update/Delete Prevention
- User A dapat ID student school 2
- `PATCH /api/v1/students/:id` atau `DELETE /api/v1/students/:id` → Harus gagal (403/404)

### Test 4: Direct School ID Bypass Attempt
- User A (school 1) mencoba `GET /api/v1/students?school_id=2` → Harus tetap return school 1 saja (karena controller override school_id)

### Test 5: Teachers Cross-School
- User A (school 1 teacher) → `GET /api/v1/teachers` → Hanya return school 1
- User B (school 2 teacher) → `GET /api/v1/teachers` → Hanya return school 2

### Test 6: Classes/Courses/Sessions Cross-School
- User A (school 1) → `GET /api/v1/classes` → Hanya school 1
- User B (school 2) → `GET /api/v1/classes` → Hanya school 2

### Test 7: Role Leakage Prevention
- User A (school 1 admin) coba akses `GET /api/v1/users/:id/roles` untuk user dari school 2
- Harus dibatasi oleh authorization layer

### Test 8: Assignment/Grade/Submission Cross-School
- User A (school 1 teacher) → `GET /api/v1/assignments` → Hanya assignments milik school 1
- User B (school 2 student) → `GET /api/v1/submissions` → Hanya submissions dari class di school 2

---

## 5. Catatan Arsitektural Penting

### Users bersifat GLOBAL (tidak per-school)
- Tabel `users` tidak memiliki kolom `school_id`
- School context ditentukan via `user_roles` (roles per school/year)
- Endpoints yang memanipulasi `users` langsung perlu special handling

### Role-based school isolation
- `UserRole` tabel memiliki `school_id` nullable (global role) dan `academic_year_id` nullable
- `RoleResolver.resolve()` mengutamakan: exact school+year > school-only > global
- User bisa punya multiple roles di different schools (cross-school admin scenario)

### `req.activeSchoolId` berasal dari header atau JWT, bukan dari user's role
- Jika user tidak mengirim `x-school-id` header, fallback ke JWT `school_id`
- JWT `school_id` di-set saat login berdasarkan "best-fit" role (prioritas: exact > school-only > global)
- Ini berarti context adalah **user's preferred/last-used school**, bukan **hard-bound** ke satu school
