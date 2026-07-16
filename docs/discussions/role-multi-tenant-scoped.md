# Diskusi — Role System untuk Multi-tenant & Multi-year

## Tujuan
Menambahkan sistem role yang memungkinkan:
1. Satu user punya **banyak role** (misalnya Guru + Admin Sekolah, atau Wali Murid)
2. Role bersifat **scoped**: berlaku di sekolah tertentu & tahun ajaran tertentu
3. Saat operasi API, sistem tahu **role aktif** berdasarkan `schoolId` + `academicYearId`

---

## Status Saat Ini (Sebelum Perubahan)

### Tabel Users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(50) DEFAULT 'student'     -- ← SATU role global per user
);
```

Problema: `users.role` adalah **single string column**. Satu user hanya bisa punya satu role, dan role itu berlaku di semua sekolah/tahun ajaran sekaligus.

### Tabel Terkait Role
```
users → teachers (FK school_id)
users → students (FK school_id)
users → refresh_tokens (FK user_id)
```

---

## Opsi Pendekatan

### Opsi 1: `user_roles` + `role_permissions` Table (Recommended)

#### Struktur Tabel Baru
```sql
-- Tabel role dasar (global, tidak tied ke tenant)
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,          -- admin, teacher, student, staff, parent, super_admin
  description VARCHAR(255)
);

-- Tabel assignment role per user (scoped)
CREATE TABLE user_roles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id INTEGER UNSIGNED NOT NULL,
  role_id INTEGER UNSIGNED NOT NULL,
  school_id INTEGER UNSIGNED NULL,           -- NULL = global (super_admin)
  academic_year_id INTEGER UNSIGNED NULL,    -- NULL = berlaku semua tahun ajaran
  is_active BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER UNSIGNED,               -- who granted this role
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
  FOREIGN KEY (granted_by) REFERENCES users(id),
  UNIQUE KEY uk_user_role_scoped (user_id, role_id, school_id, academic_year_id)
);

-- (Opsional) Granular permissions table
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  role_id INTEGER UNSIGNED NOT NULL,
  resource VARCHAR(50) NOT NULL,             -- users, assignments, grades, attendance, etc
  action VARCHAR(50) NOT NULL,               -- create, read, update, delete, manage_all
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY uk_role_action (role_id, resource, action)
);
```

#### Cara Kerja
```typescript
// Saat user login → ambil semua role-nya
const userRoles = await knex('user_roles')
  .join('roles', 'user_roles.role_id', 'roles.id')
  .join('schools', 'user_roles.school_id', 'schools.id')
  .where('user_roles.user_id', userId)
  .andWhere('user_roles.is_active', true)
  .select('roles.name as role', 'schools.id as school_id', 'schools.name as school_name')
  .orderBy('user_roles.granted_at', 'desc')

// Hasil bisa berupa:
// [
//   { role: 'super_admin',    school_id: null, school_name: null },
//   { role: 'teacher',        school_id: 1, school_name: 'SMAN 1 Jakarta' },
//   { role: 'teacher',        school_id: 2, school_name: 'SMAN 2 Bandung' }
// ]

// Saat hit API dengan query param ?schoolId=1&academicYearId=5
// Sistem filter role aktif:
const activeRole = userRoles.find(r =>
  r.school_id === 1 || r.school_id === null   // NULL = berlaku semua sekolah
)
```

#### Migration
- `015_roles.ts` — Create roles lookup table
- `016_user_roles.ts` — Create user_roles (scoped assignment)
- `017_role_permissions.ts` — (Opsional) Granular permission mapping
- Migrate existing `users.role` data → insert into `roles` + `user_roles`

#### Kelebihan
- ✅ Support multi-role per user (Guru + Staff di sekolah yang sama)
- ✅ Scoped per school & academic year
- ✅ `NULL school_id` = berlaku lintas sekolah
- ✅ `NULL academic_year_id` = berlaku semua tahun
- ✅ Audit trail: siapa grant role, kapan (`granted_by`, `granted_at`)
- ✅ Soft deactivate (set `is_active = false` tanpa delete)
- ✅ Bisa di-expand ke permission-based access control (RBAC granular)

#### Kekurangan
- ❌ Perlu migration data dari `users.role` ke `roles` + `user_roles`
- ❌ Lebih banyak join saat query (tapi masih efisien dengan index)

---

### Opsi 2: Perkecil `users.role` + Tambah `user_schools`

#### Hanya tambahkan tabel relasi:
```sql
CREATE TABLE user_schools (
  id INTEGER PRIMARY KEY,
  user_id INTEGER UNSIGNED NOT NULL,
  school_id INTEGER UNSIGNED NOT NULL,
  role VARCHAR(50) DEFAULT 'student',         -- simpan role string, bukan FK
  academic_year_id INTEGER UNSIGNED NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (school_id) REFERENCES schools(id),
  UNIQUE KEY uk_user_school (user_id, school_id, academic_year_id)
);
```

#### Perubahan minimal
- `users.role` tetap ada (fallback ke default role)
- Role yang scoped sekolah disimpan di `user_schools.role`

#### Kelebihan
- ✅ Perubahan paling minim terhadap struktur existing
- ✅ Tidak perlu migrasi data besar

#### Kekurangan
- ❌ No role lookup table — `role` jadi string yang tidak divalidasi FK
- ❌ Tidak konsisten: `users.role` vs `user_schools.role` (satu pakai FK, satu tidak)
- ❌ Sulit di-expand ke permission system
- ❌ Role name bisa typo/mismatch

---

### Opsi 3: Hapus `users.role`, Pindah Semua ke `user_roles`

Struktur mirip Opsi 1 tapi **langsung drop** kolom `users.role`:

```sql
ALTER TABLE users DROP COLUMN role;
```

Semua user harus punya entri di `user_roles`. Default role `student` di-set via constraint.

#### Kelebihan
- ✅ Struktur paling bersih
- ✅ Satu sumber kebenaran (single source of truth)

#### Kekurangan
- ❌ Breaking change besar — semua existing user kehilangan role
- ❌ Harus set constraint NOT NULL di `user_roles` untuk memastikan tiap user punya role
- ❌ Query auth (login/session) jadi perlu join ekstra

---

## Rekomendasi: Opsi 1 + Partial Rollout

Karena kode saat ini sudah berjalan dan ada tabel `users.role` yang digunakan di berbagai place, **Opsi 1** paling seimbang:

1. **Tetap pertahankan** `users.role` sebagai fallback/default
2. **Tambahkan** `roles` + `user_roles` untuk role scoped
3. **Migrasi data**: copy `users.role` ke entri `user_roles` dengan `school_id=NULL, academic_year_id=NULL`
4. **Gradual migration**: update endpoint satu-per-satu untuk membaca dari `user_roles` dulu, fallback ke `users.role`
5. Di masa depan, ketika semua endpoint sudah migrasi, baru drop `users.role`

---

## Pertanyaan yang Perlu Dijawab

### 1. Apakah role bersifat hirarkis?
Yaitu, apakah role tertentu otomatis punya hak role di bawahnya?
- Contoh: `super_admin` bisa akses `admin` → `teacher` → `student`?
- Atau semua role bersifat independen (harus assign eksplisit)?

**Saran:** Mulai dengan independen dulu, tambah hirarki kalau ada business rule yang memaksa.

### 2. Apakah perlu `permission` table atau role saja cukup?
Untuk MVP, role saja (admin/teacher/student) mungkin sudah cukup. Permission granular (`create_assignment`, `edit_grade`) bisa ditambahkan belakangan.

**Saran:** Mulai tanpa permission table (Opsi 1 + 2 tabel), tambahkan tabel `role_permissions` nanti jika diperlukan.

### 3. Bagaimana default role untuk user baru?
Saat registrasi, user langsung dapat role `student` (via `users.role`) tanpa perlu assignment manual di `user_roles`.

Ataukah setiap user baru HARUS di-assign role oleh admin?

**Saran:** Untuk student/teacher, role masih di-set via `users.role` dan akan dipindahkan ke `user_roles` saat di-link ke sekolah (misalnya saat buat record `teachers` atau `students`).

### 4. Bagaimana dengan `teachers` dan `students` table?
Saat ini, kedua tabel punya FK ke `school_id`:
```sql
-- teachers
FOREIGN KEY (school_id) REFERENCES schools(id)
FOREIGN KEY (user_id) REFERENCES users(id)

-- students
FOREIGN KEY (school_id) REFERENCES schools(id)
FOREIGN KEY (user_id) REFERENCES users(id)
```

Apakah ini artinya:
- **A.** Satu user hanya boleh jadi teacher/student di SATU sekolah (existing behavior)?
- **B.** User bisa jadi teacher di sekolah A DAN teacher di sekolah B (multi-school)?

Jika **A** saja, kita bisa gabungkan `user_roles` dengan tabel `teachers`/`students` yang ada.
Jika **B**, kita perlu `user_roles` yang benar-benar terpisah.

### 5. Apakah ada role khusus selain `teacher` / `student` / `admin`?
Yang sudah ada:
- `student` → tabel `students`
- `teacher` → tabel `teachers`
- `admin` → kemungkinan user biasa di `users.role = 'admin'`

Yang mungkin ditambahkan:
- `staff` / `admin_sekolah` — operator sekolah (bisa kelola siswa, guru, jadwal)
- `parent` / `wali_murid` — lihat progress anak (belum ada flow)
- `super_admin` — platform owner (bisa akses semua sekolah)

**Saran:** Mulai dengan 3 role dasar + 2 peran yang mungkin muncul segera: `student`, `teacher`, `admin`, `staff`, `super_admin`.

### 6. Bagaimana integrasi dengan Fastify route decorators?
Saat ini middleware auth mungkin cuma cek `request.user.role`:
```typescript
// Existing (hypothetical)
fastify.addHook('onRequest', async (req) => {
  const user = await fastify.jwt.verify(req.cookies.token)
  req.user = { id: user.id, role: user.role }  // ← satu role saja
})
```

Perlu diubah jadi:
```typescript
// New
fastify.addHook('onRequest', async (req) => {
  const user = await fastify.jwt.verify(req.cookies.token)
  const schoolId = req.query.schoolId ?? fastify.getActiveSchoolId()  // dari context cookie/header
  const activeRoles = await getActiveRoles(user.id, schoolId)
  req.user = { id: user.id, roles: activeRoles }  // ← bisa banyak role
})
```

**Pertanyaan:** Apakah `schoolId` selalu dikirim di header cookie? Atau harus di-set per-request?

### 7. Apakah academic_year wajib ada di role scope?
Misal:
- Guru X mengajar di SMAN 1 Jakarta TA 2024/2025
- Bisa guru itu mengajar di SMAN 1 Jakarta TA 2025/2026 dengan role yang sama?

**Saran:** `academic_year_id` optional (`NULL`). Kalau `NULL`, role berlaku semua tahun ajaran. Kalau ada value, role berlaku spesifik di TA tersebut.

### 8. Bagaimana dengan cross-school access?
Misal:
- Super Admin bisa akses semua sekolah → `school_id = NULL`
- Staff Dinas Pendidikan bisa akses beberapa sekolah → multiple rows `user_roles` dengan `school_id` berbeda

Apakah ini butuh feature? Atau cukup `NULL = semua sekolah` saja?

---

## Rencangan Migration Steps

Jika disetujui (Opsi 1):

```
migration 015 → roles (lookup table)
  ↳ insert seed: super_admin, admin, teacher, student, staff

migration 016 → user_roles (scoped assignments)
  ↳ FK → users, roles, schools, academic_years
  ↳ UNIQUE(user_id, role_id, school_id, academic_year_id)

migration 017 → data migration (users.role → user_roles)
  ↳ COPY existing users.role → roles lookup + user_roles assignment
  ↳ For teachers: school_id = teachers.school_id, academic_year_id = NULL
  ↳ For students: school_id = students.school_id, academic_year_id = NULL
  ↳ For admins: school_id = NULL (global admin)

update → middleware/auth
  ↳ Add active role resolution logic

update → existing routes
  ↳ Gradually switch from users.role → user_roles lookup
```

---

## Comparison Matrix

| Fitur | Opsi 1 | Opsi 2 | Opsi 3 |
|-------|--------|--------|--------|
| Multi-role per user | ✅ | ⚠️ | ✅ |
| Scoped per school | ✅ | ✅ | ✅ |
| Scoped per academic year | ✅ | ✅ | ✅ |
| Cross-school access | ✅ | ⚠️ | ✅ |
| Role validation (FK) | ✅ | ❌ | ✅ |
| Breaking change | Rendah | Minimal | Tinggi |
| Data migration | Sedang | Kecil | Besar |
| Expandable ke permissions | Mudah | Sulit | Mudah |
| Complexity | Medium | Low | High |
| Maintainability | Bagus | Cukup | Bagus |

---

## Keputusan Final (CONFIRMED)

| # | Pertanyaan | Keputusan |
|---|------------|-----------|
| 1 | Opsi pendekatan | **Opsi 1** — `roles` + `user_roles`, tanpa `role_permissions` dulu |
| 2 | Role hirarkis | **Independen dulu** — tiap role berdiri sendiri, hirarki ditambahkan nanti bila ada business rule yang memaksa |
| 3 | Permission table | **Tidak** — gunakan 2 tabel saja (`roles` + `user_roles`), tambahkan `role_permissions` di kemudian hari |
| 4 | Default role user baru | Tetap lewat `users.role`; di-link ke `user_roles` saat record `teachers`/`students` dibuat |
| 5 | Multi-school teacher/student | **B** — boleh jadi teacher di sekolah A DAN B (multi-school user) |
| 6 | Role yang di-seed | `student`, `teacher`, `admin`, `staff`, `super_admin` |
| 7 | `schoolId` di-request | **Selalu via cookie** — auth middleware baca dari cookie, fallback ke `NULL` jika tidak ada |
| 8 | `academic_year_id` | **Optional** — `NULL` = berlaku semua tahun ajaran, value = spesifik di TA tersebut |
| 9 | Cross-school access | **Supported** — `super_admin` (`school_id=NULL`) bisa lintas sekolah; staff dinas pendidikan = multiple rows dengan `school_id` berbeda |

---

## Implikasi Keputusan terhadap Skema

### Tabel Baru yang Akan Dibuat

**`roles`** — lookup role global
```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,           -- super_admin, admin, staff, teacher, student
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**`user_roles`** — scoped assignment
```sql
CREATE TABLE user_roles (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  user_id INTEGER UNSIGNED NOT NULL,
  role_id INTEGER UNSIGNED NOT NULL,
  school_id INTEGER UNSIGNED NULL,            -- NULL = lintas sekolah (super_admin)
  academic_year_id INTEGER UNSIGNED NULL,     -- NULL = semua TA
  is_active BOOLEAN DEFAULT TRUE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER UNSIGNED NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uk_user_role_scoped (user_id, role_id, school_id, academic_year_id)
);
```

### Tabel Existing yang Tetap Dipertahankan

- `users.role` — fallback default saat user baru registrasi, akan dihapus di iterasi berikut setelah semua route migrasi ke `user_roles`
- `teachers.school_id` — **tetap ada**, tapi tidak lagi jadi penentu tunggal role teacher (user bisa punya banyak entri teacher di sekolah berbeda di masa depan, atau menggunakan `user_roles` sebagai source of truth)
- `students.school_id` — sama seperti `teachers`

### Migration Data Plan

```
015_roles.ts
  - Create roles table
  - Seed roles: super_admin, admin, staff, teacher, student

016_user_roles.ts
  - Create user_roles table
  - Migrate existing data:
      • users.role = 'student'  → user_roles(role=student, school_id=students.school_id, academic_year_id=NULL)
      • users.role = 'teacher'  → user_roles(role=teacher, school_id=teachers.school_id, academic_year_id=NULL)
      • users.role = 'admin'    → user_roles(role=admin, school_id=NULL, academic_year_id=NULL)

017_resolve_active_role_helper.ts (seeder/helper)
  - Insert stored procedure / view (optional): resolve_active_role(user_id, school_id, academic_year_id)
```

### Auth Middleware Plan

```typescript
// New — reads schoolId from cookie
fastify.addHook('onRequest', async (req) => {
  const token = req.cookies.access_token
  if (!token) return
  const user = await fastify.jwt.verify(token)
  const schoolId = req.cookies.school_id  // cookie (per-tab/workspace)
  const academicYearId = req.cookies.academic_year_id  // cookie
  
  const activeRoles = await resolveActiveRoles(user.id, schoolId, academicYearId)
  req.user = {
    id: user.id,
    email: user.email,
    roles: activeRoles,        // ['teacher', 'staff', ...]
    activeSchoolId: schoolId,
    activeAcademicYearId: academicYearId,
  }
})
```

### Frontend Implication (tapi di luar scope backend)

Frontend akan mengelola cookie `school_id` dan `academic_year_id`:
- Saat user login, simpan default school (misal sekolah terakhir yang dipakai)
- User bisa switch sekolah via UI → set cookie `school_id`
- Backend baca cookie, filter role dari `user_roles`

---

## Trade-off yang Diterima

1. **`school_id` dari cookie** — memungkinkan user ganti sekolah tanpa logout, tapi juga berarti backend harus percaya isi cookie. Mitigasi: selalu re-resolve role dari `user_roles` di server-side, jangan hanya percaya role dari JWT.
2. **`academic_year_id NULL` = all years** — sederhana, tapi sulit untuk audit "guru ini di TA 2024/2025 saja". Jika nanti butuh audit per-TA, tambahkan constraint.
3. **Multi-school teacher/student** — meningkatkan fleksibilitas, tapi query jadi lebih kompleks (perlu resolve school mana yang aktif untuk konteks request tertentu).

---

## Status

✅ **Diskusi selesai, keputusan final telah diambil.**

Lanjut ke tahap berikutnya: lihat [docs/observations/role-system-implementation.md](docs/observations/role-system-implementation.md) untuk catatan implementasi teknis.
