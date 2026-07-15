# Todos: MVC Refaktor — Modul yang Belum Direfactor

> Status: Ditangguhkan — menunggu perintah lanjut
> Terakhir dicek: 2026-07-16 00:05

---

## Status Saat Ini

| Modul | Status | Catatan |
|-------|--------|---------|
| Auth | ✅ Done | 6 file (validator, controller, service, repo, routes) |
| School | ✅ Done | 6 file |
| User | ✅ Done | 4 file |
| Student | ⏳ Pending | Perlu `StudentValidator`, `StudentRepository`, `StudentService`, `StudentController`, routes refactor |
| Class | ⏳ Pending | Perlu `ClassValidator`, `ClassRepository`, `ClassService`, `ClassController`, routes refactor |
| Teacher | ⏳ Pending | Mirror student pattern |
| Subject | ⏳ Pending | Mirror school pattern (CRUD dasar) |
| AcademicYear | ⏳ Pending | Mirror school pattern |
| TeachingAssignment | ⏳ Pending | Lebih kompleks — butuh service logic |
| Attendance | ⏳ Pending | Perlu filter + agregasi |
| Assignment | ⏳ Pending | Relasi ke class+subject+teacher |
| Submission | ⏳ Pending | File upload + grading + transaction |
| Grade | ⏳ Pending | Kalkulasi nilai + filter |

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

### 2. Model Interface (opsional — interface only untuk saat ini)
```
src/models/interfaces/{Module}Interfaces.ts
```
- Interface entitas utama (mis. `Student`, `CreateStudentInput`, dll.)
- Bisa diisi saat refactor jika butuh type safety ekstra

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

## Prioritas Refactor

Urutan disarankan berdasarkan kompleksitas dependency:

| Urutan | Modul | Alasan |
|--------|-------|--------|
| 1 | `subject` | CRUD paling sederhana, tidak bergantung modul lain |
| 2 | `academic-year` | CRUD sederhana, bergantung ke school (sudah refactored) |
| 3 | `teacher` | Mirror student pattern, ada di pool |
| 4 | `student` | Sudah banyak query kompleks (join, search) |
| 5 | `class` | Bergantung school+academic-year |
| 6 | `teaching-assignment` | Multi-foreign-key + uniqueness constraint |
| 7 | `attendance` | Filter date range, agregasi |
| 8 | `assignment` | Relasi ke class+subject |
| 9 | `grade` | Perhitungan nilai, filter |
| 10 | `submission` | File upload + grading + transaction (paling kompleks) |

---

## File yang Akan Dibuat

Estimasi ~60 file baru + 13 file refactor (existing routes).

Per modul yang tersisa (rata-rata):
- 1 validator file
- 1 model interface file (opsional)
- 1 repository file
- 1 service file
- 1 controller file
- 1 route refactor (≈50 baris)

Total estimasi: ~50 file baru, ~13 file refactor.

---

## Checklist Per Modul

Untuk setiap modul, checklist:

- [ ] Buat validator (`src/validators/{module}.validator.ts`)
- [ ] Buat repository (`src/repositories/{module}.repository.ts`)
- [ ] Buat service (`src/services/{module}.service.ts`)
- [ ] Buat controller (`src/controllers/{module}.controller.ts`)
- [ ] Refactor route (`src/routes/{module}.routes.ts`)
- [ ] Run `npm run type-check` — harus 0 errors
- [ ] Run `npm run test` — harus 11 passed

---

## Catatan Khusus Per Modul

### Student
- Route saat ini join ke `users` table → perlu di-handle di repository
- Search by name + NIS → perlu di-implement di `findAll()` repository
- Pagination sudah ada → pola bisa reuse dari school

### Class
- Table `class_students` dan `teaching_assignments` punya FK ke classes
- Harus buat `hasDependents()` check sebelum delete

### Teacher
- Mirror student (ada `user_id` FK, `nip` unique)
- Punya `teaching_assignments` dependents

### Submission
- **Paling kompleks** — butuh Knex transaction
- File upload via multipart → perlu special handling di service
- Grading update assignment stats

### Attendance
- Perlu filter by date range (`date_from`, `date_to`)
- Index di DB membantu query performance

### Grade
- Multiple `assessment_type` per student+subject
- Perlu grouping/agregasi di repository

---

*File ini otomatis dibaca saat instruksi diberikan untuk lanjut refactor.*
