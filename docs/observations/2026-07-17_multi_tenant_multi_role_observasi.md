# Observasi — Multi-Tenant, Multi-Year Role Switch, dan Multi-Role

**Tanggal:** 2026-07-17  
**Scope:** Backend Zekolah — `src/`, `migrations/`, `tests/`

---

## 1. User Dapat Pindah Role Sesuai Tahun Pelajaran

### ✅ **SUPPORTED (secara skema)**

Tabel `user_roles` memiliki kolom `academic_year_id` yang memungkinkan role assignment bersifat per-tahun-ajaran:

```
user_roles: user_id + role_id + school_id + academic_year_id
```

Role resolver (`UserRoleRepository.findActive`) menggunakan **NULL-coalescing priority**:
1. Exact `school_id` + `academic_year_id` match → paling spesifik
2. Matching `school_id` dengan `academic_year_id IS NULL` → school-wide (berlaku semua tahun)
3. `school_id IS NULL` → cross-school/global (berlaku semua sekolah)

### ⚠️ **BELOM ADA API ENPOINT untuk switch/assign role**

- **Tidak ditemukan** controller/route untuk `role.assign` atau `role.switch`.
- `RoleRepository` hanya menyediakan `findByName`, `findById`, `listAll` — **tidak ada** `create`, `deactivate`, `assign`.
- `UserRoleRepository` menyediakan `insert` dan `deactivate` (soft), tapi **tidak ada** yang expose melalui HTTP API.
- Tidak ada endpoint seperti `POST /api/v1/users/:id/roles` atau `PATCH /api/v1/me/active-role`.

### 🔴 **Masalah pada Login Flow**

Saat login (`AuthService.login`), JWT **hanya** memuat `{ id, email }`. Tidak ada `school_id` atau `academic_year_id` di dalam JWT payload.

```typescript
// src/services/auth.service.ts — login method
const token = app.jwt.sign({ id: safe.id, email: safe.email })
```

Di `app.authenticate` middleware, school context ditentukan oleh **header** `x-school-id` dan `x-academic-year-id`:

```typescript
// src/app.ts — authenticate decorator
const schoolId = headers?.['x-school-id'] ? parseInt(headers['x-school-id'], 10) : undefined;
const academicYearId = headers?.['x-academic-year-id'] ? parseInt(headers['x-academic-year-id'], 10) : undefined;
```

**Kesimpulan:** User **bisa** memiliki role per academic year (di database), tapi:
- Tidak ada API untuk assign/switch role secara eksplisit
- Frontend harus mengirim `x-school-id` + `x-academic-year-id` di setiap request
- Tidak ada mechanism untuk user memilih "aktif year" mana saat login
- Saat login, user tidak mendapat list sekolah/year aktif sebagai response

**Rating: Partial — Skema support ✅, API endpoint belum ada 🔴**

---

## 2. Data Sudah Ter-filter Berdasarkan School Context

### ✅ **Beberapa sudah ter-filter**

| Entity | Filter sekolah? | Detail |
|--------|----------------|--------|
| `students` | ✅ Repo | `StudentRepository.findAll()` menerima `school_id` filter |
| `teachers` | ✅ Repo | `TeacherRepository.findAll()` menerima `school_id` filter |
| `academic_years` | ✅ Repo | `AcademicYearRepository.findAll()` menerima `school_id` filter |
| `subjects` | ✅ Repo | `SubjectRepository.findAll()` menerima `school_id` filter |

### ❌ **Banyak yang BELUM ter-filter**

| Entity | Filter sekolah? | Detail |
|--------|----------------|--------|
| `assignments` | ❌ | `AssignmentRepository.findAll()` tidak punya `school_id` filter. Hanya `class_id`, `subject_id`, `teacher_id` |
| `grades` | ❌ | `GradeRepository.findAll()` tidak punya `school_id` filter |
| `attendance` | ❌ | `AttendanceRepository.findAll()` tidak punya `school_id` filter |
| `submissions` | ❌ | `SubmissionRepository.findAll()` tidak punya `school_id` filter |
| `classes` | ❌ | `ClassRepository.findAll()` tidak punya `school_id` filter |
| `users` | ❌ | `UserService.list()` tidak punya `school_id` filter |
| `schools` | ❌ | `SchoolService.list()` langsung return semua sekolah |

### 🔴 **Masalah Utama: Controller tidak menerima school context**

Semua controller menerima data filter dari `req.query`, tapi **tidak pernah** otomatis memasukkan `school_id` dari `req.activeSchoolId` (yang diset oleh `authenticate` middleware).

Contoh — `StudentController.list`:
```typescript
// src/controllers/student.controller.ts
list = async (req: FastifyRequest, reply: FastifyReply) => {
  const filter = req.query as StudentFilterInput  // ❌ hanya dari query params
  return reply.send(await this.service.list(filter))  // ❌ tidak injeksi activeSchoolId
}
```

Yang seharusnya:
```typescript
const filter = { ...req.query as StudentFilterInput, school_id: req.activeSchoolId }
```

Ini berarti:
- Jika frontend **tidak mengirim** `school_id` di query param, semua data akan di-return (cross-school)
- Tidak ada **enforced isolation** — semua bergantung pada frontend mengirim `school_id` secara eksplisit
- Beberapa endpoint (assignments, grades, submissions, etc.) bahkan **tidak mendukung** filter sekolah sama sekali

**Rating: Partial — Skema support ✅, Enforcement di layer controller/service belum ada 🔴**

---

## 3. User Dapat Memiliki Lebih dari 1 Role

### ✅ **FULLY SUPPORTED**

#### Skema Database
- `user_roles` table dengan unique constraint `['user_id', 'role_id', 'school_id', 'academic_year_id']` memungkinkan **multiple role assignments** per user.
- Data migration di migration `016` secara otomatis memigrasi data lama ke multi-role.

#### Role Resolution
`RoleResolver.resolve()` mengembalikan **array** `ResolvedUserRole[]`:

```typescript
// ResolvedUserRole[]
[
  { role: 'teacher',     school_id: 1, academic_year_id: null, is_active: true },
  { role: 'staff',       school_id: 1, academic_year_id: null, is_active: true },
  { role: 'super_admin', school_id: null, academic_year_id: null, is_active: true },
]
```

#### Role Resolver Logic (Priority-based)
`UserRoleRepository.findActive()` menggunakan priority deduplication:
1. Exact school + academic year match (paling spesifik)
2. School-wide (matching school_id, academic_year_id IS NULL)
3. Global (school_id IS NULL)

Deduplication memastikan jika user punya role "teacher" di school 1 dengan dan tanpa academic_year_id, yang terpilih adalah yang paling spesifik.

#### requireRole Middleware
Support 3 bentuk requirement:
- **Single role:** `requireRole('admin')` — cek ada role 'admin'
- **Array roles:** `requireRole(['admin', 'staff'])` — OR logic (salah satu cukup)
- **Custom predicate:** `requireRole((roles) => roles.some(r => r.role === 'super_admin'))`

### ✅ **Fitur tambahan**
- `is_active` flag — bisa deactivate role tanpa delete (audit trail terjaga)
- `granted_by` + `granted_at` — siapa yang assign dan kapan
- `school_id = NULL` — cross-school access (super_admin)
- `academic_year_id = NULL` — berlaku semua tahun ajaran

**Rating: FULLY SUPPORTED ✅**

---

## Ringkasan

| Requirement | Status | Keterangan |
|-------------|--------|------------|
| 1. Pindah role sesuai tahun pelajaran | **Partial** ✅/🔴 | Skema DB support multi-year via `user_roles.academic_year_id`. Role resolver sudah prioritaskan exact match. **Tapi:** tidak ada API endpoint untuk assign/switch role, dan JWT login tidak mengandung school/year context |
| 2. Data ter-filter per sekolah | **Partial** ✅/🔴 | Skema DB support (semua entitas punya `school_id`). Beberapa repo sudah terima filter `school_id`. **Tapi:** controller tidak otomatis inject `activeSchoolId` dari header, dan beberapa repo (assignments, grades, attendance, submissions, classes, users, schools) **tidak punya** filter sekolah sama sekali |
| 3. User multi-role | **FULL SUPPORTED** ✅ | Skema support, resolver support, middleware support. User bisa punya banyak role per school+year |

### Rekomendasi Prioritas

1. **[Critical]** Inject `req.activeSchoolId` ke semua controller — enforced school isolation
2. **[Critical]** Tambahkan `school_id` filter di semua repository yang belum support (assignments, grades, attendance, submissions, classes, users)
3. **[High]** Buat API endpoint untuk assign/unassign roles (`POST /api/v1/users/:id/roles`, `PATCH /api/v1/user-roles/:id/deactivate`)
4. **[Medium]** Masukkan `school_id` / `academic_year_id` ke JWT payload agar tidak selalu bergantung pada header
5. **[Low]** Pertimbangkan endpoint `GET /api/v1/me/context` — list semua sekolah+year dimana user punya role aktif
