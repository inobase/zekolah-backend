# Todos: Integrasi Jurusan SMK & Kurikulum Merdeka

> **Sumber:** [docs/discussions/kurikulum-jurusan-smk-integration.md](../discussions/kurikulum-jurusan-smk-integration.md)
> **Sumber:** [docs/observations/kurikulum-jurusan-readiness.md](../observations/kurikulum-jurusan-readiness.md)
> **Created:** 2026-07-18
> **Status:** ✅ Phase 1 Complete — Phase 2 Not Started

---

## Phase 1 — Foundation: `education_level` di `schools`

> Tambah kolom `education_level` ENUM ke tabel `schools` untuk diferensiasi jenjang pendidikan (SMK, SMA, SMP, SD, dll). Jurusan hanya valid untuk SMK/MAK/PT.

### Migration

- [x] **T1.1** Buat migration `018_add_education_level_to_schools.ts`
  - [x] Tambah kolom `education_level` ENUM(`1A`,`1B`,`2A`,`2B`,`3A`,`3B`,`4A`,`5A`,`5B`) DEFAULT `'3B'` (SMK default)
  - [x] Add index pada `education_level`
  - [x] Seed migration: update existing schools ke `'3B'` (SMK) atau `'3A'` (SMA) berdasarkan data
  - [x] Down: DROP COLUMN `education_level`

### Models & Interfaces

- [x] **T1.2** Update `src/models/interfaces/SchoolInterfaces.ts`
  - [x] Tambah field `education_level` ke `School` interface
  - [x] Export `EducationLevel` type: `'1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '4A' | '5A' | '5B'`
  - [x] Export `EDUCATION_LEVELS` map (kode → label)
  - [x] Export helper: `isJurusanEligible(educationLevel)` — alias `isSmk`, return `true` jika `education_level IN ('3B','5A','5B')`
  - [x] Tambah `education_level` ke `CreateSchoolInput` dan `UpdateSchoolInput`

### Repositories

- [x] **T1.3** Update `src/repositories/school.repository.ts`
  - [x] Tambah filter optional `education_level` di `findAll` dan `search`

### Services & Controllers

- [x] **T1.4** Update `src/services/school.service.ts` — accept `education_level` filter
- [x] **T1.5** Update `src/controllers/school.controller.ts` — passthrough `education_level` filter dari query param (via `SchoolFilterInput`)

### Validators

- [x] **T1.6** Update `src/validators/school.validator.ts`
  - [x] Tambah `EDUCATION_LEVEL_ENUM` constant
  - [x] Tambah `EducationLevelSchema` z.enum()
  - [x] Tambah `education_level` di `SchoolFilterSchema` (query param)
  - [x] Tambah `education_level` di `CreateSchoolSchema` (body)
  - [x] `UpdateSchoolSchema` inherits via `.partial()`

### Routes

- [x] **T1.7** Update `src/routes/school.routes.ts`
  - [x] Tambah query param schema `education_level` di GET `/`
  - [x] Tambah body schema field `education_level` di POST `/`
  - [x] Swagger docs updated dengan tags: `['schools']`

### Tests

- [x] **T1.8** Update `tests/school.test.ts`
  - [x] Test: create school with `education_level: '3B'` → SUCCESS
  - [x] Test: create school with `education_level: '3A'` → SUCCESS
  - [x] Test: create school with invalid `education_level` → 400
  - [x] Test: filter schools by `education_level=3B` → only SMK returned
  - [x] Test: default `education_level` when not provided → `'3B'`
  - [x] **All 18 tests passing ✅**

---

## Phase 2 — Program Hierarchy

> Buat tabel `programs` dan `specializations` sebagai lookup data nasional dikelola Super Admin, serta `school_programs` dan `school_specializations` untuk linking sekolah.

### 2.1 — Tabel `programs` (Global — Super Admin) ✅ COMPLETE

- [x] **T2.1** Buat migration `019_create_programs.ts` ✅
  - [x] Kolom: `id`, `code` (UNIQUE), `name`, `description`, `education_level` (ENUM filter: 3B/5A/5B), `is_active` BOOLEAN DEFAULT TRUE, timestamps
  - [x] Seed 5 program keahlian SMK: TKR (Teknik Kendaraan Roda Berat), TSM (Teknik Sepeda Motor), TITL (Teknik Instalasi Tenaga Listrik), TBC (Teknik Bisnis Sepeda Motor), AM (Aquakultur)
  - [x] Seed 5 program keahlian MAK serupa
  - [x] Down: DROP TABLE `programs`
  - [x] Migration applied: `npm run migrate` → ✅ 2 migrations applied

- [x] **T2.2** Buat `src/models/interfaces/ProgramInterfaces.ts` ✅
  - [x] Interface `Program`: `id`, `code`, `name`, `description`, `education_level`, `is_active`, `created_at`, `updated_at`
  - [x] Interface `ProgramCreateInput`: tanpa `id`, `created_at`, `updated_at`
  - [x] Interface `ProgramUpdateInput`: partial fields
  - [x] Interface `Specialization`, `SpecializationCreateInput`, `SpecializationUpdateInput`
  - [x] Type `ProgramCode` and `ProgramName` from database enums
  - [x] Type `JurusanEducationLevel` extending `EducationLevel`
  - [x] Helper `isJurusanEligible(education_level: string)`

- [x] **T2.3** Buat `src/repositories/program.repository.ts` ✅
  - [x] `findAll(filter?)` — list programs dengan filter `education_level`, `is_active`, `search`
  - [x] `findById(id)` — single program
  - [x] `findByCode(code)` — unique code lookup
  - [x] `create(data)` — insert program
  - [x] `update(id, data)` — update program
  - [x] `deactivate(id)` — soft delete (`is_active = false`)
  - [x] `count(filter?)` — helper untuk pagination
  - [x] Specialization CRUD: `specializationFindAll`, `specializationFindById`, `specializationFindByProgram`, `specializationCreate`, `specializationUpdate`, `specializationDeactivate`, `specializationCount`

- [x] **T2.4** Buat `src/services/program.service.ts` ✅
  - [x] `list(filter)` — delegate ke repository + validate education_level
  - [x] `getById(id)` — validate existence
  - [x] `create(data)` — validate code uniqueness + education_level in JURUSAN_ELIGIBLE_LEVELS
  - [x] `update(id, data)` — validate code uniqueness if code changed
  - [x] `deactivate(id)` — soft deactivate
  - [x] `listSpecializations(programId, filter?)` — validated program existence
  - [x] `getSpecializationById(id)` — validate existence
  - [x] `createSpecialization(data)` — validate unique per program
  - [x] `updateSpecialization(id, data)` — validate unique per program
  - [x] `deactivateSpecialization(id)` — soft deactivate

- [x] **T2.5** Buat `src/controllers/program.controller.ts` ✅
  - [x] `list` — GET /api/v1/programs (SUPER_ADMIN only)
  - [x] `getById` — GET /api/v1/programs/:id (SUPER_ADMIN only)
  - [x] `create` — POST /api/v1/programs (SUPER_ADMIN only)
  - [x] `update` — PATCH /api/v1/programs/:id (SUPER_ADMIN only)
  - [x] `deactivate` — DELETE /api/v1/programs/:id (SUPER_ADMIN only)
  - [x] `listSpecializations` — GET /api/v1/programs/:programId/specializations (SUPER_ADMIN only)
  - [x] `getSpecialization` — GET /api/v1/programs/:programId/specializations/:specializationId (SUPER_ADMIN only)
  - [x] `createSpecialization` — POST /api/v1/programs/:programId/specializations (SUPER_ADMIN only)
  - [x] `updateSpecialization` — PATCH /api/v1/programs/:programId/specializations/:specializationId (SUPER_ADMIN only)
  - [x] `deactivateSpecialization` — DELETE /api/v1/programs/:programId/specializations/:specializationId (SUPER_ADMIN only)

- [x] **T2.6** Buat `src/validators/jurusan.validator.ts` ✅
  - [x] Import `JurusanEducationLevel` type (moved from SchoolInterfaces)
  - [x] Constant `JURUSAN_EDUCATION_LEVELS` string array
  - [x] Constant `JURUSAN_EDUCATION_LEVELS_CONST` const enum
  - [x] `ProgramCreateSchema` — code (UNIQUE, required), name (required), description, education_level (ENUM required), is_active
  - [x] `ProgramUpdateSchema` — partial fields
  - [x] `ProgramFilterSchema` — education_level, is_active, search
  - [x] `ProgramResponseSchema` — full Program object
  - [x] `ProgramListResponseSchema` — paginated list
  - [x] `SpecializationCreateSchema` — program_id (required), code (required), name (required), description, is_active
  - [x] `SpecializationUpdateSchema` — partial
  - [x] `SpecializationResponseSchema` — full Specialization
  - [x] `SpecializationListResponseSchema` — paginated
  - [x] Program validation helpers: `validateProgramCreate`, `validateProgramUpdate`, `validateProgramFilter`
  - [x] Specialization validation helpers: `validateSpecializationCreate`, `validateSpecializationUpdate`, `validateSpecializationList`

- [x] **T2.7** Buat `src/routes/program.routes.ts` ✅
  - [x] `GET /` — list (tags: 'jurusan', summary: 'List semua program keahlian')
  - [x] `GET /:id` — getById (tags: 'jurusan', summary: 'Get detail program keahlian')
  - [x] `POST /` — create (tags: 'jurusan', summary: 'Create program keahlian baru')
  - [x] `PATCH /:id` — update (tags: 'jurusan', summary: 'Update program keahlian')
  - [x] `DELETE /:id` — deactivate soft delete (tags: 'jurusan', summary: 'Deactivate program keahlian')
  - [x] `GET /:programId/specializations` — list specializations
  - [x] `GET /:programId/specializations/:specializationId` — get specialization
  - [x] `POST /:programId/specializations` — create specialization
  - [x] `PATCH /:programId/specializations/:specializationId` — update specialization
  - [x] `DELETE /:programId/specializations/:specializationId` — deactivate specialization
  - [x] Semua: `security: [{ bearerAuth: [] }]`
  - [x] Guard: `requireRole(['super_admin'])`
  - [x] OpenAPI documentation dengan summary, tags, dan response schemas

- [x] **T2.8** Register route di `src/routes/index.ts` — prefix `/programs` ✅
  - [x] Import: `import programRoutes from './program.routes'`
  - [x] Register: `fastify.register(programRoutes, { prefix: '/programs' })`

- [x] **T2.9** Test — TypeScript compilation ✅ CLEAN
  - [x] `npx tsc --noEmit` — 0 errors, 0 warnings
  - [x] All files compile successfully

### 2.2 — Tabel `specializations` (Global — Super Admin) ✅ COMPLETE

- [x] **T2.10** Buat migration `020_create_specializations.ts` ✅
  - [x] Kolom: `id`, `program_id` (FK → programs), `code` (UNIQUE per program), `name`, `description`, `is_active` BOOLEAN DEFAULT TRUE, timestamps
  - [x] Unique index: `(program_id, code)` — not global unique
  - [x] Seed: 22 specializations across 10 programs (TSM→2, TKR→3, TITL→3, TBC→2, AM→2, TPHP→2, TBSM→2, AK→2, AP→2, TB→2)
  - [x] Down: DROP TABLE `specializations`
  - [x] **Migration applied:** `npm run migrate -- latest` → ✅ Applied successfully

- [x] **T2.11** Update `src/models/interfaces/ProgramInterfaces.ts` ✅
  - [x] Tambah interface `Specialization`: `id`, `program_id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`
  - [x] Tambah interface `SpecializationCreateInput`
  - [x] Tambah interface `SpecializationUpdateInput`

- [x] **T2.12** Update `src/repositories/program.repository.ts` ✅
  - [x] Tambah `specializationFindAll(programId?, filter?)`
  - [x] Tambah `specializationFindById(id)`
  - [x] Tambah `specializationFindByProgram(programId)` — all specs for a program
  - [x] Tambah `specializationCreate(data)`
  - [x] Tambah `specializationUpdate(id, data)`
  - [x] Tambah `specializationDeactivate(id)`

- [x] **T2.13** Update `src/services/program.service.ts` ✅
  - [x] Tambah `listSpecializations(programId, filter?)`
  - [x] Tambah `getSpecializationById(id)`
  - [x] Tambah `createSpecialization(data)` — validate unique per program
  - [x] Tambah `updateSpecialization(id, data)`
  - [x] Tambah `deactivateSpecialization(id)`

- [x] **T2.14** Update `src/controllers/program.controller.ts` ✅
  - [x] Tambah endpoint `GET /:programId/specializations` — list specializations by program
  - [x] Tambah endpoint `POST /:programId/specializations` — create specialization
  - [x] Tambah endpoint `PATCH /:programId/specializations/:specId` — update
  - [x] Tambah endpoint `DELETE /:programId/specializations/:specId` — deactivate

- [x] **T2.15** Update `src/validators/jurusan.validator.ts` ✅
  - [x] Tambah `SpecializationCreateSchema`
  - [x] Tambah `SpecializationUpdateSchema`
  - [x] Tambah `SpecializationResponseSchema`
  - [x] Tambah `SpecializationListResponseSchema`
  - [x] Validation helpers: `validateSpecializationCreate`, `validateSpecializationUpdate`, `validateSpecializationList`

- [x] **T2.16** Update `src/routes/program.routes.ts` ✅
  - [x] Tambah 4 endpoints baru di bawah `/programs/:programId/specializations`
  - [x] Tags: 'jurusan', summary, security schemas

### 2.3 — Tabel `school_programs` & `school_specializations` (School-Scoped) ✅ COMPLETE

- [x] **T2.17** Buat migration `021_create_school_programs.ts` ✅
  - [x] Kolom: `id`, `school_id` (FK → schools), `program_id` (FK → programs), `is_active` BOOLEAN DEFAULT TRUE, `activated_at`, `activated_by` (FK → users), timestamps
  - [x] Unique index: `(school_id, program_id)` — sekolah tidak bisa activate program twice
  - [x] Down: DROP TABLE `school_programs`

- [x] **T2.18** Buat migration `022_create_school_specializations.ts` ✅
  - [x] Kolom: `id`, `school_program_id` (FK → school_programs), `specialization_id` (FK → specializations), `is_active` BOOLEAN DEFAULT TRUE, `activated_at`, `activated_by` (FK → users), timestamps
  - [x] Unique index: `(school_program_id, specialization_id)`
  - [x] Down: DROP TABLE `school_specializations`

- [x] **T2.19** Buat `src/models/interfaces/SchoolProgramInterfaces.ts` ✅
  - [x] Interface `SchoolProgram`: `id`, `school_id`, `program_id`, `program` (joined), `is_active`, `activated_at`, `activated_by`, timestamps
  - [x] Interface `SchoolSpecialization`: `id`, `school_program_id`, `specialization_id`, `specialization` (joined), `is_active`, timestamps

- [x] **T2.20** Buat `src/repositories/schoolProgram.repository.ts` ✅
  - [x] `findAllBySchool(schoolId)` — programs offered by school
  - [x] `findById(id, schoolId?)` — single school program
  - [x] `findBySchoolAndProgram(schoolId, programId)` — check duplicate activation
  - [x] `getAvailablePrograms(schoolId, educationLevel)` — programs matching school's education_level
  - [x] `insertSchoolProgram`, `deactivateSchoolProgram`
  - [x] `findAllBySchoolProgram`, `insertSchoolSpecialization`, `deactivateSchoolSpecialization`

- [x] **T2.21** Buat `src/services/schoolProgram.service.ts` ✅
  - [x] `list(schoolId)` — return active + inactive school programs
  - [x] `getAvailable(schoolId)` — validate program education_level matches school
  - [x] `activate(schoolId, programId, userId)` — validate education_level match + unique check
  - [x] `deactivate(id, schoolId, userId)` — cascade deactivate to specializations

- [x] **T2.22** Buat `src/controllers/schoolProgram.controller.ts` ✅
  - [x] `getAvailable` — GET /api/v1/schools/:schoolId/programs/available — list program yang bisa di-adopt (matching education_level)
  - [x] `activate` — POST /api/v1/schools/:schoolId/programs/activate
  - [x] `deactivate` — DELETE /api/v1/schools/:schoolId/programs/:programId
  - [x] `listSpecializations` — GET /api/v1/schools/:schoolId/programs/:schoolProgramId/specializations
  - [x] `activateSpecialization` — POST /api/v1/schools/:schoolId/programs/:schoolProgramId/specializations/activate
  - [x] `deactivateSpecialization` — DELETE /api/v1/schools/:schoolId/programs/:schoolProgramId/specializations/:specId
  - [x] Semua: SCHOOL_ADMIN scope (only admin of that school)

- [x] **T2.23** Update `src/validators/jurusan.validator.ts`
  - [x] Not needed — validation inline in routes (params/body schemas)

- [x] **T2.24** Update `src/routes/index.ts` ✅
  - [x] Register route file baru `schoolProgram.routes.ts`
  - [x] Prefix: `/schools`

- [x] **T2.25** Tests ✅
  - [x] `tests/school-program.test.ts` — 15 tests passing ✅
    - [x] GET /available returns SMK programs for SMK school
    - [x] GET /available returns empty for SMA school (no matching programs)
    - [x] GET /available returns 401 without token
    - [x] POST activate creates school_program linking to matching program
    - [x] POST activate returns 400 if program education_level does not match school
    - [x] POST activate returns 409 if program already activated
    - [x] POST activate returns 404 for non-existent program
    - [x] GET programs lists school_programs for active school
    - [x] DELETE deactivates school program
    - [x] POST activate specialization creates linkage
    - [x] DELETE deactivate specialization
    - [x] CROSS-SCHOOL: School B cannot activate School A programs
    - [x] Access control: GET /available returns 401 without auth
    - [x] POST activate returns 401 without token
    - [x] Cascade deactivate: deleting school program deactivates specializations

---

## Phase 4 — School Subjects (Redesigned — Direct CRUD per Sekolah, Tanpa Kurikulum Templates)

> **Catatan:** Phase ini diredesign dari "Adopt Curriculum Template" menjadi "Direct School Subject Management".
> Sekolah membuat/mengelola mata kuliah sendiri yang scoped per specialization (`school_specializations`).
> Tidak ada kurikulum template adoption — setiap sekolah bebas membuat struktur mata kuliahnya sendiri.
> Migration 024 (`kurikulum_template_structures`) dan migration 025 (`kurikulum_adoptions`) tidak dipakai.
> Migration 025 yang seharusnya `kurikulum_adoptions` diganti menjadi `school_subjects`.

### 4.1 — Tabel `school_subjects` (School-Scoped) ✅ COMPLETE

- [x] **T4.1** Buat migration `025_create_school_subjects.ts` ✅
  - [x] Kolom: `id`, `school_id` (FK → schools), `specialization_id` (FK → school_specializations), `name` (VARCHAR 200), `code` (VARCHAR 50), `subject_type` ENUM('UMUM','DD','DP','SP'), `jp_per_minggu` (INT), `jp_per_semester` (INT), `theory_hours` (INT), `practice_hours` (INT), `customizable` BOOLEAN DEFAULT TRUE, `created_at`, `updated_at`
  - [x] Index: `(school_id, name)`, `(school_id, code)`, `(school_id, specialization_id)`
  - [x] Catatan: `name`, `code`, `jp_per_minggu` bisa di-overwrite sekolah (customizable = TRUE)
  - [x] Auto-calculate `jp_per_semester = jp_per_minggu * 18` saat create/update
  - [x] Down: DROP TABLE `school_subjects`
  - [x] **Migration applied** via `npm run migrate`

### 4.2 — Models & Interfaces ✅ COMPLETE

- [x] **T4.2** Buat `src/models/interfaces/SchoolSubjectInterfaces.ts` ✅
  - [x] Interface `SchoolSubject`: all columns + `specialization` (joined)
  - [x] Interface `SchoolSubjectCreateInput`: tanpa `id`, `created_at`, `updated_at`
  - [x] Interface `SchoolSubjectUpdateInput`: partial fields
  - [x] Type `SchoolSubjectType`: 'UMUM' | 'DD' | 'DP' | 'SP'

### 4.3 — Repository ✅ COMPLETE

- [x] **T4.3** Buat `src/repositories/schoolSubject.repository.ts` ✅
  - [x] `findAll(schoolId, filter?)` — list subjects dengan filter specialization_id, search
  - [x] `findById(id, schoolId?)` — single subject
  - [x] `create(data)` — insert subject, auto-calculate `jp_per_semester`
  - [x] `update(id, schoolId, data)` — update subject, recalculate `jp_per_semester` if `jp_per_minggu` changes
  - [x] `delete(id, schoolId)` — hard delete
  - [x] `findBySchoolAndSpecialization(schoolId, specializationId)` — list by specialization
  - [x] `count(schoolId, filter?)` — helper for pagination

### 4.4 — Service ✅ COMPLETE

- [x] **T4.4** Buat `src/services/schoolSubject.service.ts` ✅
  - [x] `list(schoolId, filter)` — validate school access, delegate to repository
  - [x] `getById(id, schoolId)` — validate existence + school ownership
  - [x] `create(schoolId, data, userId)` — validate school ownership, calculate jp_per_semester
  - [x] `update(id, schoolId, data)` — validate ownership, recalculate jp_per_semester
  - [x] `delete(id, schoolId)` — validate ownership
  - [x] `listBySpecialization(schoolId, specializationId)` — filtered by specialization

### 4.5 — Controller & Routes ✅ COMPLETE

- [x] **T4.5** Buat `src/controllers/schoolSubject.controller.ts` ✅
  - [x] `list` — GET /api/v1/schools/:schoolId/subjects (SCHOOL_ADMIN)
  - [x] `getById` — GET /api/v1/schools/:schoolId/subjects/:id (SCHOOL_ADMIN)
  - [x] `create` — POST /api/v1/schools/:schoolId/subjects (SCHOOL_ADMIN)
  - [x] `update` — PATCH /api/v1/schools/:schoolId/subjects/:id (SCHOOL_ADMIN)
  - [x] `delete` — DELETE /api/v1/schools/:schoolId/subjects/:id (SCHOOL_ADMIN)
  - [x] `listBySpecialization` — GET /api/v1/schools/:schoolId/specializations/:specId/subjects (SCHOOL_ADMIN)

- [x] **T4.6** Buat `src/routes/schoolSubject.routes.ts` ✅
  - [x] Semua endpoint dengan tags: 'jurusan', summary, security
  - [x] Guard: SCHOOL_ADMIN scope (only admin of that school)
  - [x] Pagination: page/limit query params for GET list
  - [x] Response schemas with Zod validation

- [x] **T4.7** Register route di `src/routes/index.ts` ✅
  - [x] Import: `import schoolSubjectRoutes from './schoolSubject.routes'`
  - [x] Register: `fastify.register(schoolSubjectRoutes, { prefix: '/schools' })`

### 4.8 — Tests ✅ COMPLETE

- [x] **T4.8** `tests/schoolSubject.test.ts` — **15 tests passing ✅**
  - [x] POST creates school subject with all fields (201)
  - [x] POST auto-calculates `jp_per_semester = jp_per_minggu * 18`
  - [x] POST returns 400 if `jp_per_minggu` <= 0
  - [x] POST returns 400 if `subject_type` is invalid
  - [x] POST requires authentication (401)
  - [x] GET lists school subjects with pagination
  - [x] GET filters by `specialization_id`
  - [x] GET by ID returns subject
  - [x] GET by ID returns 404 for non-existent subject
  - [x] PATCH updates school subject
  - [x] PATCH updates `jp_per_semester` when `jp_per_minggu` changes
  - [x] DELETE deletes school subject
  - [x] GET /schools/:schoolId/specializations/:specId/subjects returns subjects
  - [x] Cross-school: School B cannot see School A subjects
  - [x] GET lists without auth returns 401

---

## Phase 5 — Schedules & Time Slots

> Tabel `schedules` untuk jadwal pelajaran per kelas, dengan time slots detail hari/jam/ruangan/guru.

### 5.1 — Tabel `schedules` & `schedule_time_slots`

- [ ] **T5.1** Buat migration `026_create_schedules.ts`
  - [ ] Kolom: `id`, `class_id` (FK → classes), `school_subject_id` (FK → school_subjects), `teacher_id` (FK → teachers), `academic_year_id` (FK → academic_years), `semester` ENUM('ganjil','genap'), `status` ENUM('scheduled','cancelled','rescheduled'), `room` (VARCHAR 50, nullable), `created_at`, `updated_at`
  - [ ] Index: `(class_id, academic_year_id, semester)`, `(teacher_id, academic_year_id, semester)`, `(school_subject_id, academic_year_id, semester)`
  - [ ] Unique constraint: UNIQUE `(class_id, academic_year_id, semester, day_of_week, start_time)` — prevent double-booking kelas per slot
  - [ ] Down: DROP TABLE IF EXISTS `schedule_time_slots`, DROP TABLE `schedules`

- [ ] **T5.2** Buat migration `027_create_schedule_time_slots.ts`
  - [ ] Kolom: `id`, `schedule_id` (FK → schedules CASCADE DELETE), `day_of_week` ENUM('senin','selasa','rabu','kamis','jumat','sabtu'), `start_time` (TIME), `end_time` (TIME), `room` (VARCHAR 50, nullable, overrides schedule.room), timestamps
  - [ ] Index: `(schedule_id, day_of_week)`
  - [ ] Down: DROP TABLE `schedule_time_slots`

### 5.2 — Models

- [ ] **T5.3** Buat `src/models/interfaces/ScheduleInterfaces.ts`
  - [ ] `Schedule`, `ScheduleCreateInput`, `ScheduleUpdateInput`
  - [ ] `ScheduleTimeSlot`, `ScheduleTimeSlotCreateInput`
  - [ ] `ScheduleWithDetails` (JOINED: class, school_subject, teacher, academic_year)
  - [ ] `ScheduleConflict` — untuk validasi bentrok

### 5.3 — Repositories

- [ ] **T5.4** Buat `src/repositories/schedule.repository.ts`
  - [ ] `findAll(filter: schoolId, classId?, teacherId?, academicYearId?, semester?)`
  - [ ] `findById(id, schoolId?)`
  - [ ] `create(data)`
  - [ ] `update(id, data)`
  - [ ] `delete(id, schoolId)`
  - [ ] `findByClass(classId, academicYearId, semester)` — all schedules for a class
  - [ ] `findByTeacher(teacherId, academicYearId, semester)` — all schedules for a teacher
  - [ ] `checkConflict(scheduleId, classId, teacherId, dayOfWeek, startTime, endTime, excludeId?)` — DETECT double-booking
  - [ ] `createTimeSlots(scheduleId, slots[])` — batch insert
  - [ ] `deleteTimeSlots(scheduleId)` — cleanup
  - [ ] `getScheduleWithDetails(id)` — JOIN full data for response

### 5.4 — Services

- [ ] **T5.5** Buat `src/services/schedule.service.ts`
  - [ ] `list(filter)` — delegate to repository
  - [ ] `create(data)` — validate冲突, create schedule + time slots transactionally
  - [ ] `update(id, data)` — re-validate conflict on time/day changes
  - [ ] `delete(id, schoolId)` — cascade delete time slots
  - [ ] `findByClass(classId, academicYearId, semester)`
  - [ ] `findByTeacher(teacherId, academicYearId, semester)`
  - [ ] `getWeeklyTimetable(classId, academicYearId, semester)` — grouped by day
  - [ ] `getTeacherWeeklyTimetable(teacherId, academicYearId, semester)`
  - [ ] `detectConflicts(filter)` — list all conflicts for auditing

### 5.5 — Controllers

- [ ] **T5.6** Buat `src/controllers/schedule.controller.ts`
  - [ ] `list` — GET /api/v1/schedules (SCHOOL_ADMIN/TEACHER)
  - [ ] `getById` — GET /api/v1/schedules/:id (SCHOOL_ADMIN/TEACHER)
  - [ ] `create` — POST /api/v1/schedules (SCHOOL_ADMIN)
  - [ ] `update` — PATCH /api/v1/schedules/:id (SCHOOL_ADMIN)
  - [ ] `delete` — DELETE /api/v1/schedules/:id (SCHOOL_ADMIN)
  - [ ] `getByClass` — GET /api/v1/schedules/class/:classId (SCHOOL_ADMIN/TEACHER)
  - [ ] `getByTeacher` — GET /api/v1/schedules/teacher/:teacherId (SCHOOL_ADMIN/TEACHER/self)
  - [ ] `getWeeklyTimetable` — GET /api/v1/schedules/class/:classId/timetable (SCHOOL_ADMIN/STUDENT)
  - [ ] `detectConflicts` — GET /api/v1/schedules/conflicts (SCHOOL_ADMIN)

### 5.6 — Validators & Routes

- [ ] **T5.7** Update `src/validators/schedule.validator.ts`
  - [ ] `ScheduleCreateSchema` — class_id, school_subject_id, teacher_id, academic_year_id, semester, time_slots[]
  - [ ] `ScheduleUpdateSchema` — partial
  - [ ] `ScheduleFilterSchema` — class_id, teacher_id, academic_year_id, semester
  - [ ] `ScheduleTimeSlotSchema` — day_of_week, start_time, end_time, room
  - [ ] Response schemas: `ScheduleResponseSchema`, `ScheduleListResponseSchema`, `TimetableResponseSchema`

- [ ] **T5.8** Buat `src/routes/schedule.routes.ts`
  - [ ] Semua endpoint CRUD + timetable dengan tags: 'jadwal'
  - [ ] Guard: SCHOOL_ADMIN untuk write, TEACHER untuk read

- [ ] **T5.9** Register route di `src/routes/index.ts` — prefix `/schedules`

### 5.7 — Tests

- [ ] **T5.10** `tests/schedule.test.ts`
  - [ ] SCHOOL_ADMIN CRUD schedules
  - [ ] TEACHER hanya READ schedules
  - [ ] STUDENT hanya READ jadwal kelas sendiri
  - [ ] Create schedule dengan double-booking kelas → 409 conflict
  - [ ] Create schedule dengan double-booking guru → 409 conflict
  - [ ] Update schedule → re-validate conflict
  - [ ] Delete schedule → cascade delete time slots
  - [ ] `getWeeklyTimetable` returns grouped by day structure
  - [ ] Cross-school access → 404

---

## Phase 6 — Integration & Cleanup

> Finalisasi: cross-school isolation, backward compatibility, data migration dari `subjects`/`teachers.specialization`.

### 6.1 — Cross-School Isolation

- [ ] **T6.1** Verifikasi semua repository baru filter `school_id`
  - [ ] `schoolProgram.repository` → filter `school_id`
  - [ ] `kurikulum.repository` → filter `school_id` untuk school_subjects
  - [ ] `schedule.repository` → filter `school_id` (via class_id JOIN)
  - [ ] Global repos (`program.repository`, `specialization`, `kurikulum_template`) → NO school_id filter

- [ ] **T6.2** Update `tests/cross-school-leakage.test.ts`
  - [ ] Tambah tests untuk: school_subjects, schedules, adoptions
  - [ ] Verify Sekolah A tidak bisa akses data Sekolah B

### 6.2 — Data Migration

- [ ] **T6.3** Buat `src/repositories/dataMigration.repository.ts` (atau script terpisah)
  - [ ] `migrateTeachersSpecializationToSchoolSpecialization()` — mapping `teachers.specialization` varchar → `school_specializations` FK
  - [ ] `migrateSubjectsToSchoolSubjects()` — untuk sekolah yang belum adopt template, copy existing `subjects` → `school_subjects`
  - [ ] Script ini dijalankan sekali via CLI atau migration seed

- [ ] **T6.4** Migration `028_migrate_legacy_data.ts`
  - [ ] Step 1: Migrate `teachers.specialization` → `school_specializations` (best-effort match by name)
  - [ ] Step 2: Migrate `subjects` → `school_subjects` (set subject_type = 'UMUM' default, customizable = FALSE)
  - [ ] Step 3: Mark migrations as run (prevent re-run)

### 6.3 — Backward Compatibility

- [ ] **T6.5** Update `subjects` existing — deprecasi sebagai "kurikulum template SMK"
  - [ ] Tambah komentar di migration bahwa `subjects` sudah tidak direkomendasikan untuk SMK
  - [ ] Endpoint `subjects` tetap jalan untuk SMA/jenjang lain (education_level != '3B')
  - [ ] Tambah warning di Swagger docs

- [ ] **T6.6** Update `teaching_assignments` — pastikan compatible dengan `school_subjects`
  - [ ] Pertimbangkan: `teaching_assignments.subject_id` → `school_subjects.id` (bukan `subjects.id`)
  - [ ] Atau biarkan `teaching_assignments` tetap ke `subjects` dan buat `teaching_assignments_school_subjects` (migrasi gradual)
  - [ ] **Keputusan:** Biarkan `teaching_assignments.subject_id` ke `subjects.id` (existing). `school_subjects` hanya untuk `schedules`.

### 6.4 — Final Tests

- [ ] **T6.7** `npm test` — semua existing tests masih passing
- [ ] **T6.8** `tsc --noEmit` — zero errors
- [ ] **T6.9** Swagger docs — semua endpoint baru ter-document (tags: jurusan, kurikulum, jadwal)
- [ ] **T6.10** Rollback test — migrasi down bisa berjalan bersih

---

## Summary Checklist

| Phase | Status | Est. Days |
|-------|--------|-----------|
| P1: `education_level` di `schools` | ✅ Complete (8/8 tasks) | 1-2 |
| P2: Program Hierarchy | ✅ Complete (T2.1–T2.25, migrations 020–022, 15 tests) | 2–3 |
| P3: Curriculum Templates | ❌ Skipped | - |
| P4: School Subjects (Direct CRUD) | ✅ Complete (T4.1–T4.8, migration 025, 15 tests, redesi) | 2–3 |
| P5: Schedules & Time Slots | ⬜ Not Started | 3–4 |
| P6: Integration & Cleanup | ⬜ Not Started | 2–3 |
| **Total** | | **~7-9 hari** |

---

*Todos ini dibuat berdasarkan observasi kesiapan dan diskusi integrasi kurikulum SMK. Update status setelah setiap phase selesai.*

**Last Updated: 2026-07-19**
- ✅ Phase 2 (Program Hierarchy) — FULLY COMPLETE (T2.1 through T2.25)
- ✅ Phase 4 (School Subjects — Redesigned) — FULLY COMPLETE (T4.1 through T4.8)
  - ✅ Migration `025` (school_subjects + seeds) applied
  - ✅ `tests/schoolSubject.test.ts` — 15 tests passing (CRUD, validation, cross-school isolation, auth, pagination)
  - ✅ Redesign: direct CRUD per school specialization (no curriculum template adoption)
- ✅ TypeScript compilation: 0 errors
- ✅ `tests/helper.ts` updated with new tables in truncate list
- ❌ Phase 3 (Curriculum Templates) — **SKIPPED** by decision
