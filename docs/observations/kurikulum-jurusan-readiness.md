# Observasi: Zekolah Backend — Kesiapan Integrasi Jurusan SMK & Kurikulum Merdeka

**Tanggal:** 2026-07-18  
**Status:** pra-implementasi

---

## 1. Arsitektur Saat Ini

### 1.1 Tech Stack
| Komponen | Teknologi | Keterangan |
|---------|-----------|------------|
| Framework | Fastify v5 + TypeScript | RESTful API, `ZodTypeProvider` |
| ORM | Knex v3 | MySQL (prod), SQLite (test) |
| Auth | JWT (`@fastify/jwt`) | Stateless, bearer token |
| Validasi | Zod | Semua routes sudah ter-schema |
| Dokumentasi | Swagger/OpenAPI 3.x | 16 route files, 65+ endpoints documented |
| Testing | Vitest + Supertest | 257+ passing tests |

### 1.2 Pola Arsitektur
- **Controller → Service → Repository** — tiga lapis pemisahan concern
- **Repository layer** — semua DB queries terisolasi, mudah di-test mock
- **Middleware chain** — `authenticate` (decorator) + `requireRole` (factory)
- **Multi-tenant scoped** — semua entity terikat `school_id`, filter via `req.activeSchoolId`
- **Multi-role** — `user_roles` table mendukung scoped role per school + academic year

---

## 2. Skema Database Existing (17 tabel)

| # | Tabel | FK Utama | Scope | Catatan |
|---|-------|---------|-------|---------|
| 1 | `users` | — | Global | Auth & identity, `role` column DEPRECATED |
| 2 | `schools` | — | Global | Tenant root, **tidak ada kolom `education_level`** |
| 3 | `academic_years` | `schools` | Per sekolah | Punya kolom `semester` (ganjil/genap) |
| 4 | `roles` | — | Global | 5 seed roles: super_admin, admin, staff, teacher, student |
| 5 | `user_roles` | `users`, `roles`, `schools`, `academic_years` | Scoped | Multi-role resolution + context switching |
| 6 | `teachers` | `users`, `schools` | Per sekolah | Punya `specialization` (varchar, tidak terstruktur) |
| 7 | `subjects` | `schools` | Per sekolah | Nama + kode, **tidak ada tipe (umum/produktif)** |
| 8 | `classes` | `schools`, `academic_years`, `teachers` | Per sekolah | Grade (X/XI/XII), vacancy, wali kelas |
| 9 | `students` | `users`, `schools`, `classes` | Per sekolah | NIS/NISN unik |
| 10 | `class_students` | `classes`, `students`, `academic_years` | Per sekolah | Enrollment per TA |
| 11 | `teaching_assignments` | `teachers`, `classes`, `subjects`, `academic_years` | Per sekolah | Guru mengajar kelas+mapel per TA |
| 12 | `attendance` | `teaching_assignments`, `students` | Per siswa | Kehadiran per sesi |
| 13 | `grades` | `teaching_assignments`, `students` | Per siswa | Nilai per assessment |
| 14 | `assignments` | `teaching_assignments`, `teachers` | Per tugas | PR/Proyek |
| 15 | `submissions` | `assignments`, `students` | Per pengumpulan | Jawaban + skor |
| 16 | `refresh_tokens` | `users` | Global | Token rotation |
| 17 | `drop_users_role_column` | — | — | Migration untuk drop kolom legacy |

---

## 3. Gap Analisis: Existing vs Kurikulum Merdeka SMK

### 3.1 Missing Tables (Relatif terhadap rencana)

| Tabel yang Perlu Dibuat | Tujuan | Dependency |
|------------------------|--------|------------|
| `programs` | Program Keahlian (TKR, TSM, dll) | Global (Super Admin) |
| `specializations` | Kompetensi Keahlian per Program | → `programs` |
| `school_programs` | Sekolah menawarkan program apa | → `schools`, → `programs` |
| `school_specializations` | Sekolah menawarkan kompetensi apa | → `school_programs`, → `specializations` |
| `kurikulum_templates` | Template kurikulum per program (Super Admin) | → `programs`, → `specializations` |
| `school_subjects` | Mapel scoped per sekolah (adopt dari template) | → `schools`, → `kurikulum_templates` |
| `kurikulum_structures` | Mapping semester ↔ school_subjects ↔ JP | → `school_subjects`, → `academic_years` |
| `schedules` | Jadwal pelajaran (hari, jam, ruang, guru) | → `classes`, → `school_subjects`, → `teachers`, → `academic_years` |
| `schedule_time_slots` | Detail jam per hari | → `schedules` |

### 3.2 Existing Tables yang Butuh Perubahan

| Tabel | Perubahan yang Dibutuhkan | Alasan |
|-------|--------------------------|--------|
| `schools` | Tambah kolom `education_level` ENUM | Diferensiasi SMK (3B) vs SMA (3A) vs SD/MPLB dll. Jurusan hanya untuk SMK/MAK/PT |
| `subjects` | Tambah kolom `category` (UMUM/DD/PRODUKTIF) atau pisahkan ke `school_subjects` | Existing subjectsscoped per sekolah tapi tidak bedakan tipe mapel kurikulum |
| `teachers.specialization` | Migrasi ke `school_specializations` (structured FK) | Saat ini varchar bebas, perlu terstruktur per kompetensi keahlian |
| `classes.grade` | Tambah kolom `program_id` atau `specialization_id` | Kelas SMK perlu tahu program/kompetensi |
| `teaching_assignments` | Tambah `semester` atau pakai `academic_years.semester` | Penugasan guru per semester |

### 3.3 Missing Features (Relatif terhadap Kurikulum Merdeka SMK)

| Fitur | Status Existing | Keterangan |
|-------|----------------|------------|
| Template kurikulum nasional | ❌ Tidak ada | Super Admin perlu bisa mendefinisikan struktur kurikulum per program keahlian |
| Adopt kurikulum per sekolah | ❌ Tidak ada | Sekolah perlu browse & aktifkan template |
| Jenis mapel (Umum/DD/Produktif) | ❌ Tidak ada | Subjects tidak membedakan tipe mapel |
| JP (Jam Pelajaran) per mapel per semester | ❌ Tidak ada | Tidak ada alokasi JP dalam schema |
| Jadwal pelajaran (schedules) | ❌ Tidak ada | Table schedules belum ada |
| Struktur jurusan (program/kompetensi) | ❌ Tidak ada | Tidak ada tabel programs/specializations |
| Multi-guru mengajar mapel yang sama | ⚠️ Partial | `teaching_assignments` support 1-guru-per-mapel-per-kelas |
| Tracking sertifikasi kompetensi | ❌ Tidak ada | Butuh untuk SMK (LS/UPS) |
| Nilai teori vs praktik terpisah | ⚠️ Partial | `grades` support berbagai `assessment_type` tapi tidak spesifik teori/praktik |

---

## 4. Kekuatan yang Bisa Dijadikan Fondasi

| Kekuatan | Keterangan | Bagaimana Manfaatinya |
|----------|-----------|----------------------|
| Multi-tenant architecture | Semua tabel terikat `school_id` | `school_subjects`, `schedules`, dll. bisa langsung pakai pola yang sama |
| Multi-role RBAC | `user_roles` dengan priority resolution | Super Admin manage templates, School Admin activate & customize |
| Academic year + semester | `academic_years.semester` sudah ada | `kurikulum_structures` bisa langsung bind ke semester |
| Teaching assignments | Mapping guru → kelas → mapel | `schedules` bisa re-use pola ini + tambah time slots |
| Classes (grade X/XI/XII) | Sudah ada kolom `grade` | Program/specialization bisa join ke kelas untuk jadwal |
| Teachers specialization | Ada kolom varchar | Perlu direstrukturisasi ke FK ke `specializations` |
| Zod + Swagger | Full type safety + docs | Semua endpoint baru bisa langsung ter-document |
| Cross-school isolation | 25+ integration tests | Pola isolasi data per sekolah bisa di-reuse untuk tabel jurusan |
| Repository pattern | Clean separation | Repository baru untuk programs/specializations mengikuti pola yang sama |

---

## 5. Potensi Konflik & Tantangan

### 5.1 `subjects` vs `school_subjects`
**Masalah:** Tabel `subjects` existing sudah scoped per sekolah tapi tidak cocok untuk kurikulum SMK karena:
- Tidak membedakan mapel umum vs produktif
- Tidak punya alokasi JP per semester
- Tidak punya hierarki (Dasar Kejuruan vs Produktif Spesifik)

**Solusi:** Gunakan `school_subjects` sebagai pengganti yang lebih kaya. `subjects` bisa tetap ada untuk mapel umum antar sekolah atau dilepas ke global scope (super admin).

### 5.2 Migrasi `teachers.specialization`
**Masalah:** Kolom saat ini `VARCHAR(200)` — teks bebas. Tidak terstruktur.

**Solusi:** Migration data — coba map ke nama specialization jika match, atau biarkan NULL lalu user input ulang. Tambah FK constraint di masa depan.

### 5.3 `classes` vs Schedules
**Masalah:** `classes` sudah ada dengan field `grade`, `name`, `academic_year_id`. Tapi untuk SMK, satu kelas bisa berubah jadwal per semester dan perlu binding ke program/specialization.

**Solusi:** Tambah kolom `program_id` dan `specialization_id` ke `classes` untuk SMK. Schedules tetap table terpisah karena lebih banyak atribut (ruang, jam, hari).

### 5.4 Performance
**Masalah:** JOIN chain jadi lebih dalam: `schedules → school_subjects → kurikulum_structures → kurikulum_templates → programs → specializations`.

**Solusi:**
- Index pada semua FK
- View atau denormalisasi untuk query list schedules yang sering diakses
- Caching untuk template kurikulum ( jarang berubah)

### 5.5 Data Isolation untuk Tables Baru
**Masalah:** Semua tabel jurusan baru perlu mengikuti pola cross-school isolation yang sudah ada.

**Solusi:**
- `programs`, `specializations`, `kurikulum_templates` → **global (super_admin)**
- `school_programs`, `school_specializations`, `school_subjects`, `kurikulum_structures`, `schedules` → **school-scoped**
- Setiap repository baru wajib filter `school_id` kecuali untuk global tables

---

## 6. Estimasi Kompleksitas (High-Level)

| Phase | Estimasi Kompleksitas | Ketergantungan |
|-------|----------------------|---------------|
| P1: `education_level` di `schools` | **Low** — 1 kolom tambah + index | Tidak ada |
| P2: Programs & Specializations | **Medium** — 4 tables, Super Admin CRUD | P1 (optional filter by education_level) |
| P3: Kurikulum Templates | **Medium** — template management API, school adoption flow | P2 |
| P4: School Subjects & Structures | **High** — mapping semester, JP, migrasi dari subjects | P3 |
| P5: Schedules & Time Slots | **High** — conflict detection, teacher assignment integration | P4 |
| P6: Integration & Testing | **Medium** — cross-school isolation, multi-role guards | P1-P5 |

---

## 7. Rekomendasi Urutan Implementasi

### Pendekatan: Phased, tapi Big-Bang Design

1. **Phase 1 — Foundation (1-2 hari)**
   - Tambah `education_level` ENUM ke `schools`
   - Migration seed data untuk jenjang pendidikan
   - Update validator + interface

2. **Phase 2 — Program Hierarchy (2-3 hari)**
   - `programs` (SUPER_ADMIN CRUD)
   - `specializations` (SUPER_ADMIN CRUD, FK → programs)
   - `school_programs` (SCHOOL ADOPT)
   - `school_specializations` (SCHOOL ADOPT)

3. **Phase 3 — Curriculum Templates (2-3 hari)**
   - `kurikulum_templates` (SUPER_ADMIN CRUD)
   - Endpoint: daftar template, aktifkan template
   - `school_subjects` (SCOPED PER SEKOLAH)
   - `kurikulum_structures` (semester ↔ school_subjects ↔ JP)

4. **Phase 4 — Scheduling (3-4 hari)**
   - `schedules` (class × school_subject × teacher × semester)
   - `schedule_time_slots` (day, start_time, end_time, room)
   - Conflict detection (guru double-booked, ruang double-booked)

5. **Phase 5 — Integration (2-3 hari)**
   - Cross-school isolation untuk semua tabel baru
   - Role-based access control per tipe user
   - Tests: 40-60 integration tests

**Total estimasi: ~10-15 hari kerja.**

---

## 8. Rekomendasi Teknis

### 8.1 Database
- Gunakan `ENUM` untuk `education_level` dan `semester` — fixed set
- Semua tabel baru wajib punya `school_id` (kecuali template/global lookup)
- Index pada semua FK + composite index untuk query patterns yang umum

### 8.2 API Design
- Gunakan pola `ZodTypeProvider` yang sudah ada (sesuai v1.0.5)
- Group endpoints di Swagger tag: `jurusan`, `kurikulum`, `jadwal`
- Endpoint template: `GET /api/v1/kurikulum/templates`, `POST /api/v1/kurikulum/:templateId/adopt`

### 8.3 Type Safety
- Buat interfaces baru di `src/models/interfaces/` (ikuti nama: `ProgramInterfaces.ts`, `SpecializationInterfaces.ts`, `ScheduleInterfaces.ts`)
- Validators di `src/validators/` (ikuti nama: `jurusan.validator.ts`, `kurikulum.validator.ts`, `schedule.validator.ts`)

### 8.4 Repository Pattern
- Setiap entity baru: 1 repository file
- Factory pattern untuk instantiate (lihat `roleRepository` / `userRoleRepository`)
- Semua repo baru wajib implement `filterBySchoolId` pattern

### 8.5 Testing Strategy
- Unit tests per repository (mock Knex)
- Integration tests per endpoint (supertest + test DB)
- Cross-school isolation tests (ikuti pola `tests/cross-school-leakage.test.ts`)
- Schedule conflict tests (guru, ruang, kelas)

---

*Observasi ini dibuat sebelum implementasi Phase 1. Gunakan sebagai reference saat memulai coding.*
