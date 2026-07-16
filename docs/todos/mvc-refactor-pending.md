# Todos: MVC Refaktor — Modul yang Belum Direfactor

> Status: Refactor Dasar Selesai + Semua Modul Direfactor — Testing Selesai
> Terakhir dicek: 2026-07-16 11:15

---

## Status Saat Ini

| Modul | Status | Catatan |
|-------|--------|---------|
| Auth | ✅ Done | 6 file (validator, controller, service, repo, routes) |
| School | ✅ Done | 6 file |
| User | ✅ Done | 4 file |
| Subject | ✅ Done | 6 file (validator, interface, controller, service, repo, routes) |
| AcademicYear | ✅ Done | 6 file |
| Teacher | ✅ Done | 6 file — NIP uniqueness, FK ke user+school |
| Student | ✅ Done | 6 file — NIS uniqueness, FK ke user+school, hasDependents |
| Class | ✅ Done | 6 file — FK ke school+academic_year+teacher, hasStudents check |
| TeachingAssignment | ✅ Done | 6 file — Multi-FK + uniqueness constraint |
| Attendance | ✅ Done | 6 file — Filter date range, agregasi per siswa |
| Assignment | ✅ Done | 6 file — Relasi ke class+subject+teacher, hasDependents |
| Submission | ✅ Done | 6 file — File upload + grading dengan auto-graded timestamp |
| Grade | ✅ Done | 6 file — Score max validation, grouping per assessment_type |

### Verifikasi Terakhir
- `npm run build` → 0 errors
- `npm test` → **190 tests passed** ✅

### Verifikasi Terakhir
- `npm run build` → 0 errors
- `npm test` → **37 tests passed**
- `GET /api/v1/students` → 401 (auth middleware OK)
- `GET /api/v1/teachers` → 401 (auth middleware OK)
- `GET /api/v1/classes` → 401 (auth middleware OK)
- `GET /health` → 200 OK

---

## Modul yang Sudah Direfactor

| Modul | Status | Catatan |
|-------|--------|---------|
| TeachingAssignment | ✅ Done | 6 file — Multi-FK + uniqueness constraint |
| Attendance | ✅ Done | 6 file — Filter date range, agregasi per siswa |
| Assignment | ✅ Done | 6 file — Relasi ke class+subject+teacher, hasDependents |
| Submission | ✅ Done | 6 file — File upload + grading dengan auto-graded timestamp |
| Grade | ✅ Done | 6 file — Score max validation, grouping per assessment_type |

### Perubahan Terakhir
- ✅ Semua 5 modul direfactor: validator, repository, service, controller, route, interface
- ✅ Test suite lengkap: **190 tests passed**
- ✅ Bug fixes: repository timestamp handling (created_at/updated_at), findById join academic_years, findByUniqueFields .first() iteration
- ✅ Fix migration `max_score` dari `string` ke `decimal` pada tabel grades

---

## Pattern Template untuk Setiap Modul

Setiap modul MVC membutuhkan file-file berikut:

### 1. Validator (wajib)
```
src/validators/{module}.validator.ts
```
- Import `z` from zod
- Buat schema untuk CREATE, UPDATE, FILTER
- Export type via `z.infer<>`
- Untuk field optional yang boleh null → `.nullable().optional()` lalu interface field pakai `T | null`

### 2. Model Interface (opsional — untuk type safety ekstra)
```
src/models/interfaces/{Module}Interfaces.ts
```
- Interface entitas utama
- Jika validator pakai `.nullable()`, interface field juga harus `T | null`

### 3. Repository (wajib untuk yang butuh bisnis logic)
```
src/repositories/{module}.repository.ts
```
- CRUD dasar: `findAll`, `findById`, `create`, `update`, `delete`
- Filter/count untuk paginasi
- Business checks: `hasDependents`, `findByUniqueField`, dll.

### 4. Service (wajib untuk yang butuh bisnis logic)
```
src/services/{module}.service.ts
```
- Validasi bisnis (duplikat, dependensi, konsistensi FK)
- Error handling via `AppError`
- Transaksi jika butuh atomisitas (submission)

### 5. Controller (wajib untuk SEMUA modul)
```
src/controllers/{module}.controller.ts
```
- Method per route: `list`, `getById`, `create`, `update`, `delete`
- Hanya: parse request → panggil service → return reply
- No business logic

### 6. Route (WAJIB refactor)
```
src/routes/{module}.routes.ts
```
- Import controller + validators
- Hanya registrasi route + preValidation
- Delegate ke controller methods

---

## Status Akhir Refactor

### Semua Modul Telah Selesai ✅

Refactor MVC telah selesai untuk semua modul. Berikut ringkasan:

| # | Modul | Alasan Diprioritaskan | Status |
|---|-------|----------------------|--------|
| 1 | `teaching-assignment` | Multi-FK + uniqueness constraint | ✅ Done |
| 2 | `attendance` | Filter date range & agregasi | ✅ Done |
| 3 | `assignment` | Relasi class+subject+teacher | ✅ Done |
| 4 | `submission` | Transaksi atomik (file + grade) | ✅ Done |
| 5 | `grade` | Score max validation, grouping | ✅ Done |

### Test Coverage

- Total: **190 tests** across **14 test files**
- Status: ✅ Semua passing
- Bug fixes teridentifikasi selama testing:
  - `created_at`/`updated_at` NOT NULL di repository insert (6 modules)
  - `teaching_assignment.findById` missing `academic_years` join
  - `findByUniqueFields` iteration error pada `.first()`
  - Migration `grades.max_score` type: `string` → `decimal`

Tidak ada modul refactor yang belum selesai.