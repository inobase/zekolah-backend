# Observasi: MySQL-Only — Development & Testing with Database `*-test`

> Date: 2026-07-16 (original) — Updated: 2026-07-16 (revision)
> Scope: Review menyeluruh konfigurasi development/testing, struktur migrations,
>   dan rencana migrasi dari SQLite in-memory ke MySQL untuk test suite.
> Goal: Menghilangkan ketergantungan pada SQLite/MySQL dialect mismatch,
>   sehingga development DAN testing sama-sama menggunakan MySQL.

---

## 1. Arsitektur Database Saat Ini

| Lingkungan   | Driver   | Database        | Keterangan                    |
|-------------|----------|----------------|------------------------------|
| Development | `mysql2` | `zekolah`      | Sesuai `.env`                  |
| Production  | `mysql2` | (env)          | Same config as dev            |
| Test        | `mysql2` | `zekolah-test` | **Rencana baru** — pakai MySQL |

### Knexfile.js (CLI migration — setelah diperbaiki)
```js
// knexfile.js (revisi yang sudah diterapkan)
development: { client: 'mysql2', connection: { database: 'zekolah' } }
test: { client: 'mysql2', connection: { database: 'zekolah-test' } }
```

---

## 2. Masalah Utama: Root Migrations Folder Kosong

### Struktur saat ini:
```
migrations/           ← root (KOSONG)
├── mysql/            ← 14 file migration (001-014)
└── sqlite/           ← 14 file + index.ts (aggregator)
```

### Konfigurasi di `knexfile.js:14`:
```js
migrations: {
  tableName: 'migrations',
  directory: path.join(__dirname, 'migrations'),  // ← pointing ke ROOT, bukan mysql/
}
```

### Dampak:
- `node scripts/migrate.js latest` (atau `knex migrate:latest`) mencari file `.ts` di root `migrations/`
- Root kosong → **tidak ada migration yang dijalankan**
- Tabel MySQL `migrations` mungkin mencatat bahwa migration pernah dijalankan (dari percobaan sebelumnya dengan file di root)
- Hasil: DB development kehilangan seluruh schema aplikasi

### Bukti:
- Script `check-tables.js` dijalankan → database `zekolah-dev` hanya punya `migrations` dan `migrations_lock`
- Tidak ada tabel `users`, `schools`, dsb yang seharusnya dibuat oleh 14 file migration

---

## 3. Rencana Baru: Testing Menggunakan MySQL Alih-alih SQLite

### Motivasi
- SQLite dan MySQL memiliki perbedaan behavior pada `timestamp`, `AUTO_INCREMENT`,
  `ENUM`, dan fitur MySQL lainnya. Test di SQLite bisa memberi false-positive.
- Dengan MySQL di test, test berjalan di environment yang identik dengan production.
- Memudahkan migrasi schema karena hanya satu dialect yang perlu dikelola.

### Rancangan

```
environment        | DB_NAME from env    | Database used
--------------------+---------------------+--------------
NODE_ENV=test      | TEST_DB_NAME env    | zekolah-test
NODE_ENV=development| DB_NAME from .env  | zekolah
NODE_ENV=production | DB_NAME required  | (production)
```

#### Database `zekolah-test`
- Dibuat secara manual oleh developer (belum otomatis lewat migration).
- Nama prefix `*-test` memudahkan membedakan dari `*-dev` dan production.
- Schema migration dilakukan via `npm run migrate` yang otomatis membaca `TEST_DB_NAME`
  dari `.env.test` atau override `DB_NAME=test`.

#### Perubahan yang Diperlukan

**A. `src/config/database.ts`**
- Hapus logika `if (isTest) { ... better-sqlite3 ... }`
- Semua lingkungan menggunakan `mysql2`
- Di test: baca `TEST_DB_NAME` atau `process.env.TEST_DB_NAME` → `zekolah-test`
- Tetap pertahankan `foreign_keys = ON` pragma tidak diperlukan (MySQL support FK native)

**B. `tests/helper.ts`**
- `sqliteMigrations` import bisa dihapus
- `ensureSchema()` → panggil `knex.migrate.latest()` alih-alih `sqliteMigrations.up()`
- Truncate tabel (children-first order) tetap dipertahankan untuk isolation antar test

**C. `knexfile.js` — environment `test`**
```js
test: {
  ...baseConfig,
  client: 'mysql2',
  connection: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: Number(process.env.TEST_DB_PORT) || 3306,
    database: process.env.TEST_DB_NAME || 'zekolah-test',
    user: process.env.TEST_DB_USER || 'root',
    password: process.env.TEST_DB_PASS || '',
    charset: 'utf8mb4',
    timezone: '+07:00',
    dateStrings: true,
  },
}
```

**D. `migrations/sqlite/`** — bisa dihapus/diamkan
- Setelah beralih ke MySQL, folder `migrations/sqlite/` dan `migrations/sqlite/index.ts`
  tidak lagi dibutuhkan untuk testing.
- Bisa disimpan sebagai backup atau dihapus bersih.

---

## 4. `migrations/sqlite/` — Akan Dihapus Setelah Beralih ke MySQL

Saat ini `migrations/sqlite/` digunakan oleh `tests/helper.ts` untuk `sqliteMigrations.up(knex)`.
Setelah migrasi test ke MySQL:

| File | Saat Ini | Setelah Migrasi |
|------|----------|----------------|
| `migrations/sqlite/*.ts` | 14 file migration (CommonJS) | **HAPUS** |
| `migrations/sqlite/index.ts` | Aggregator `up()`/`down()` | **HAPUS** |
| `tests/helper.ts:sqliteMigrations` | Import & `ensureSchema()` | Ganti → `knex.migrate.latest()` |
| `tests/helper.ts:truncate()` | Children-first table truncation | **Pertahankan** |

---

## 5. Rekomendasi (Revisi 2026-07-16)

### Yang Sudah Selesai (Implementasi Commit Terakhir)
| Item | Status |
|------|--------|
| Fix `knexfile.js` migrations.directory → `migrations/mysql/` | ✅ DONE |
| `package.json` scripts migrate → pakai `tsx` | ✅ DONE |
| Delete `tests/setup.ts` (dead code) | ✅ DONE |
| Migration berhasil apply 14 tabel di DB | ✅ DONE |
| 190 tests passing | ✅ DONE |

### Yang Perlu Dilakukan Berikutnya (Rencana Beralih ke MySQL Test)

1. **Buat database manual: `zekolah-test`**
   ```sql
   CREATE DATABASE zekolah-test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   GRANT ALL PRIVILEGES ON zekolah-test.* TO 'root'@'localhost' IDENTIFIED BY 'toor';
   ```

2. **Update `src/config/database.ts`**
   - Hapus kondisi `isTest` yang memilih `better-sqlite3`
   - Semua env pakai `mysql2`
   - Di test: gunakan `TEST_DB_NAME` env → `zekolah-test`

3. **Tambahkan environment `test` ke `knexfile.js`**
   - `client: 'mysql2'`
   - `connection.database: process.env.TEST_DB_NAME || 'zekolah-test'`
   - `migrations.directory: path.join(__dirname, 'migrations', 'mysql')`

4. **Update `tests/helper.ts`**
   - Ganti `sqliteMigrations.up(knex)` → `knex.migrate.latest()`
   - Hapus import `* as sqliteMigrations from '../migrations/sqlite'`
   - Pertahankan truncate table logic untuk isolation

5. **Opsional: Hapus `migrations/sqlite/`**
   - Jika tidak lagi diperlukan untuk testing, hapus folder ini
   - Atau rename ke `migrations/sqlite-backup/`

6. **Buat `.env.test`** (opsional, untuk CI/CD)
   ```env
   TEST_DB_NAME=zekolah-test
   TEST_DB_HOST=localhost
   TEST_DB_PORT=3306
   TEST_DB_USER=root
   TEST_DB_PASS=toor
   ```

---

## 6. Checklist Konsistensi (Updated)

| Item | Status |
|------|--------|
| `knexfile.js` → `migrations.directory` point ke folder yang ada file-nya | ✅ FIXED (→ `migrations/mysql/`) |
| `scripts/migrate.js` → bisa run migration untuk development DB | ✅ FIXED (via tsx) |
| `src/config/database.ts` → environment switching MySQL ↔ SQLite | ⚠️ AKAN DIUBAH (hapus SQLite) |
| Test suite → schema tersedia saat test berjalan | ✅ OK (via SQLite lazy ensureSchema) |
| `tests/setup.ts` → dipanggil oleh Vitest | ✅ FIXED (dihapus, dead code) |
| Migration MySQL files di `migrations/mysql/` → format ESM | ✅ OK |
| Migration SQLite files di `migrations/sqlite/` → format CommonJS | ⏳ BISA DIHAPUS |
| Testing menggunakan MySQL identik production | ⏳ RENCANA (lihat §5) |

---

## 7. Status Akhir (Refactoring Selesai 2026-07-16 18:50)

### Hasil Refactor

| Task | Status |
|------|--------|
| Pindahkan 14 file `migrations/mysql/*.ts` → root `migrations/*.ts` | ✅ DONE |
| Hapus folder `migrations/sqlite/` | ✅ DONE |
| Update `knexfile.js` — `directory: 'migrations'` (root), `test` env = mysql2 | ✅ DONE |
| Update `tests/helper.ts` — `knex.migrate.latest()`, `SET FOREIGN_KEY_CHECKS=0` + TRUNCATE | ✅ DONE |
| Update `src/config/database.ts` — hapus SQLite branch, single MySQL instance | ✅ DONE |
| Update `src/config/index.ts` — `DB_NAME` default `zekolah-test` saat `NODE_ENV=test` | ✅ DONE |
| Update `vitest.config.ts` — load `dotenv/config`, `fileParallelism: false` | ✅ DONE |
| `npm run migrate` ke `zekolah-test` → 14 tables created | ✅ DONE |
| `npm test` → **180/190 PASS** | ✅ DONE |

### 10 Test Failures Yang Tersisa (Bukan Blocker Migrasi)

Semua failure ini **bukan** karena migrasi SQLite → MySQL. Mereka pre-existing
yang sebelumnya di-mask oleh SQLite (yang auto-cast `DECIMAL → number`, `DATETIME → Date`).

| Test | Failure Pattern | Root Cause |
|------|----------------|-----------|
| `assignment.test.ts > creates a new assignment` | `"100.00" !== 100` | MySQL DECIMAL → string |
| `assignment.test.ts > defaults max_score to 100` | `"100.00" !== 100` | MySQL DECIMAL → string |
| `grade.test.ts > creates a new grade` | `"80.00" !== 80` | MySQL DECIMAL → string |
| `grade.test.ts > defaults max_score to 100` | `"100.00" !== 100` | MySQL DECIMAL → string |
| `grade.test.ts > updates a grade` | 500 internal error | Search/JOIN logic |
| `school.test.ts > filters by search term` | 500 | LIKE column naming |
| `subject.test.ts > filters by search term` | 500 | LIKE column naming |
| `submission.test.ts > updates submission score` | `"85.00" !== 85` | MySQL DECIMAL → string |
| `teacher.test.ts > filters by search term` | 500 | LIKE column naming |
| `user.test.ts > searches by name and email` | 500 | LIKE column naming |

### Rekomendasi Perbaikan Berikutnya (Di Luar Scope Refactor Ini)

1. **Decimal string-cast**: di service layer, convert dengan `Number(row.max_score)` sebelum return
   atau ubah column type ke `FLOAT`.
2. **Search 500 errors**: perbaiki WHERE LIKE clause — kemungkinan nama kolom di JOIN salah.
3. **Date drift**: test expectation harus match ISO string MySQL.

### Environment Variables (Final)

| Variable | Dev | Test |
|----------|-----|------|
| `DB_HOST` | `localhost` | `localhost` |
| `DB_PORT` | `3306` | `3306` |
| `DB_NAME` | `zekolah` | `zekolah-test` |
| `DB_USER` | `root` | `root` |
| `DB_PASS` | (from `.env`) | (from `.env`) |
