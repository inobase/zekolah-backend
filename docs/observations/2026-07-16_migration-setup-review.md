# Rekap Review Setup Migrasi & Testing — 2026-07-16

> Scope: Verifikasi konfigurasi `knexfile.js`, `package.json`, dan `scripts/migrate.js`
> beserta konsistensinya dengan struktur migrasi SQLite/MySQL dan test suite.

---

## ✅ Yang Sudah Benar

### 1. `package.json` — Scripts lengkap
| Script | Fungsi | Status |
|--------|--------|--------|
| `npm run migrate` | Latest migration via `node scripts/migrate.js latest` | ✅ OK |
| `npm run migrate:rollback` | Rollback | ✅ OK |
| `npm run migrate:make` | Buat file migrasi baru via `knex migrate:make` | ✅ OK |
| `npm run seed` | Seed admin user via custom script | ✅ OK |
| `npm test` | Vitest run (190 tests) | ✅ OK |

Dependencies penting sudah terpasang: `knex@^3.1.0`, `mysql2@^3.11.0`, `better-sqlite3@^12.11.1`, `tsx@^4.19.0`, `vitest@^4.1.10`, `@types/better-sqlite3`, `bcryptjs`, `dotenv`.

### 2. Struktur Migrasi
- `migrations/mysql/` (14 file): MySQL-flavored migrations dengan `table.timestamps(true, true)`
- `migrations/sqlite/` (14 file + `index.ts`): SQLite-flavored dengan `dateTime` eksplisit
- `migrations/002_add_class_advisor_id.ts` di root: MySQL-only, hanya alter table
- `migrations/sqlite/index.ts`: Aggregator yang mengekspor `up`/`down` untuk dipanggil via `sqliteMigrations.up(knex)` di `tests/setup.ts`

### 3. `scripts/migrate.js`
- Memuat `dotenv`, membaca `NODE_ENV`
- Branch `latest`, `rollback`, `seed` lengkap
- Seed admin + teacher + student sample dengan password `Admin@12345`

### 4. Test Suite
- 190 tests, 14 files, semua passing
- Setup otomatis dengan `tests/setup.ts` → `sqliteMigrations.up(knex)` di SQLite in-memory
- Test helper (`tests/helper.ts`) truncate 14 tabel per test (children-first order)

---

## ⚠️ Issue yang Ditemukan

### 1. `knexfile.js` — Tidak Multi-Environment

```js
function knexConfig() {
  const knexConfig = { /* single object */ };
  return knexConfig;  // ❌ return langsung, bukan { development, test, production }
}
```

**Masalah:** `scripts/migrate.js` line 12 melakukan:

```js
const config = knexConfig()[env] || knexConfig();
```

Pola ini **mengharapkan** `knexfile.js` return object `{ development, test, production }`. Saat ini hanya return single config, jadi `knexConfig()[env]` = `undefined`, dan fallback ke `knexConfig()` selalu. Berfungsi secara kebetulan tapi **rapuh**.

**Rekomendasi fix:**

```js
function knexConfig() {
  const base = {
    pool: { min: 2, max: 10, /* timeouts */ },
    migrations: { tableName: 'migrations', directory: path.join(__dirname, 'migrations') },
    seeds: { directory: path.join(__dirname, 'seeds') },
  };
  return {
    development: {
      ...base,
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'zekolah',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        charset: 'utf8mb4',
        timezone: '+07:00',
        dateStrings: true,
      },
    },
    test: {
      ...base,
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    },
    production: {
      ...base,
      client: 'mysql2',
      connection: { /* wajib dari env */ },
    },
  };
}
```

### 2. `scripts/migrate.js` — `runSeed()` Hardcoded, Bukan dari `seeds/`

- File `seeds/01_admin_user.js` ada tapi **tidak pernah dipanggil**
- Semua seed logic ditulis manual di `migrate.js:50-100` (admin, teacher, student)
- `knex seed:run` (CLI Knex) tidak pernah dipakai

**Rekomendasi:** Pindah logic `runSeed()` ke `seeds/01_admin_user.js` dan gunakan `knex.seed.run()` atau tetap custom dengan `knex.seed.run()`.

### 3. `scripts/migrate.js` — `runSeed()` FK Constraint Risk

```js
await knex('users').del();  // ❌ Tidak hapus teachers, students, schools, dll
```

**Masalah:** Kalau DB berisi data dengan FK ke `users` (mis. ada `teachers` dari `users`), `del()` akan gagal karena FK constraint. Urutan truncate harus children-first seperti di `tests/helper.ts`.

**Rekomendasi fix:**

```js
const tables = [
  'submissions', 'assignments', 'grades', 'attendance',
  'teaching_assignments', 'class_students', 'teachers', 'students',
  'subjects', 'classes', 'academic_years', 'schools', 'refresh_tokens',
  'users',
];
await knex.raw('SET FOREIGN_KEY_CHECKS = 0'); // MySQL
for (const t of tables) await knex(t).del().catch(() => {});
await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
```

### 4. `package.json` — `knex-migrator` Tidak Dipakai

`knex-migrator@^5.3.0` di `devDependencies` tapi tidak ada satu pun import di source. Kemungkinan:
- Sisa eksperimen migrasi library pihak ketiga
- Atau seharusnya menjadi pengganti `scripts/migrate.js` tapi tidak selesai diimplementasi

**Rekomendasi:** Hapus dependency kalau tidak dipakai, atau lengkapi implementasinya.

### 5. Migration `002_add_class_advisor_id.ts` — Hanya MySQL

File ini ada di root `migrations/`, hanya untuk MySQL. Tidak ada versi SQLite-nya. Kalau test butuh apply seluruh migrations, ini bisa terlewat — tapi saat ini test pakai `sqlite/index.ts` aggregator yang **tidak** termasuk file root ini. Aman untuk sekarang, tapi bisa jadi inkonsistensi antara dev DB dan test DB.

**Rekomendasi:** Buat mirror `migrations/sqlite/002_add_class_advisor_id.ts` atau pindahkan ke `migrations/mysql/`.

### 6. `knexfile.js` — `connection.dateStrings: true`

Properti `dateStrings: true` hanya valid untuk **mysql2** client. Untuk SQLite akan diabaikan (tidak masalah). Untuk library `mysql`, ini juga diabaikan. Saat ini aman karena `client: 'mysql2'`.

---

## 📋 Test Coverage Recap

| # | Test File | Tests | Status |
|---|-----------|-------|--------|
| 1 | auth.test.ts | (auth flows) | ✅ |
| 2 | health.test.ts | (health check) | ✅ |
| 3 | school.test.ts | (CRUD school) | ✅ |
| 4 | user.test.ts | (CRUD user) | ✅ |
| 5 | subject.test.ts | (CRUD subject) | ✅ |
| 6 | academic-year.test.ts | (CRUD academic year) | ✅ |
| 7 | teacher.test.ts | (CRUD teacher + NIP uniqueness) | ✅ |
| 8 | student.test.ts | (CRUD student + NIS uniqueness) | ✅ |
| 9 | class.test.ts | (CRUD class + hasStudents check) | ✅ |
| 10 | teaching-assignment.test.ts | (Multi-FK + uniqueness) | ✅ |
| 11 | attendance.test.ts | (date range filter + agregasi) | ✅ |
| 12 | assignment.test.ts | (class+subject+teacher relation) | ✅ |
| 13 | submission.test.ts | (file upload + grading) | ✅ |
| 14 | grade.test.ts | (score validation + grouping) | ✅ |
| **Total** | **14 files** | **190 tests** | **✅ ALL PASS** |

---

## 🔧 Bug Fixes Selama Testing (Recap)

| # | Module | Issue | Fix |
|---|--------|-------|-----|
| 1 | teaching-assignment | `findById` missing `academic_years` join → "no such column" | Tambah `.join('academic_years', ...)` |
| 2 | teaching-assignment | `findByUniqueFields` iteration error pada `.first()` (yang return single object) | Ganti `const [row] = ... .first()` → langsung `.first()` |
| 3 | attendance | `create()` tanpa `created_at`/`updated_at` → NOT NULL constraint | Tambah `{ ...data, created_at: now, updated_at: now }` |
| 4 | assignment | Sama: `create()` tanpa timestamps | Sama |
| 5 | submission | Sama: `create()` tanpa timestamps | Sama |
| 6 | grade | Sama: `create()` tanpa timestamps | Sama |
| 7 | grade | `max_score` migration type `string(10)` default `'100'` → response `"100.0"` | Ubah ke `decimal(5, 2)` default `100` di SQLite & MySQL |

---

## 🎯 Rekomendasi Prioritas

1. **Refactor `knexfile.js` jadi multi-environment** (development/test/production) — risiko tinggi kalau salah migrate di production.
2. **Fix `runSeed()` FK constraint** dengan urutan truncate yang benar atau disable FK_CHECKS.
3. **Hapus `knex-migrator` atau implementasikan** — saat ini dead dependency.
4. **Mirror migration SQLite** untuk `002_add_class_advisor_id.ts` agar dev/test konsisten.
5. **Pertimbangkan pindahkan seed logic ke `seeds/`** agar konsisten dengan struktur migrations.

---

> File ini dihasilkan dari review pada 2026-07-16 11:20 (wib) terhadap setup migrasi zekolah-backend. Tidak dilakukan perubahan kode — hanya observasi dan rekomendasi.
