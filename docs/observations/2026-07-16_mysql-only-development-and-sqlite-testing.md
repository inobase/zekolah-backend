# Observasi: MySQL-Only Development & SQLite In-Memory Setup

> Date: 2026-07-16
> Scope: Review menyeluruh konfigurasi development/testing, struktur migrations,
>   dan penggunaan SQLite in-memory.
> Goal: Mengidentifikasi mengapa CLI migration `knex migrate.latest()` gagal
>   dan bagaimana memperbaiki agar development hanya memakai MySQL.

---

## 1. Arsitektur Database Saat Ini

| Lingkungan   | Driver        | Database     | Koneksi                          |
|-------------|---------------|-------------|---------------------------------|
| Development | `mysql2`      | `zekolah-dev` | `src/config/database.ts:28-41`   |
| Production  | `mysql2`      | (env)       | `src/config/database.ts:28-41`   |
| Test        | `better-sqlite3` | `:memory:` | `src/config/database.ts:17-24`   |

### Knexfile.js (CLI migration)
```js
// knexfile.js
development: { client: 'mysql2', connection: { database: 'zekolah-dev' } }
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

## 3. Sistem Test Menggunakan SQLite In-Memory dengan Custom Migration

### Cara kerja:
```
tests/helper.ts
  → import * as sqliteMigrations from '../migrations/sqlite'
  → ensureSchema(knex) checks if users table exists
  → if not, sqliteMigrations.up(knex)  ← aggregator from index.ts
```

### `migrations/sqlite/index.ts`:
- Import semua file `.ts` dari `migrations/sqlite/`
- Mengekspor fungsi `up(knex)` yang menjalankan `await users.up(knex)` secara berurutan
- Aggregate pattern agar test tidak perlu import 14 file terpisah

### `migrations/sqlite/*.ts`:
- 14 file migration dengan gaya CommonJS (`exports.up`, `exports.down`)
- Mirip dengan MySQL tapi menggunakan `dateTime` bukan `timestamps(true, true)`
- Tidak pakai FK constraint otomatis (dikelola manual)

### Catatan Penting:
- **`tests/setup.ts` EXIST TAPI TIDAK PERNAH DIPANGGIL**
- `vitest.config.ts` tidak memiliki `setupFiles` atau `globalSetup`
- Migration SQLite dijalankan secara **lazies di `tests/helper.ts:ensureSchema()`**, bukan di vitest setup
- Jika `ensureSchema` tidak terpanggil (mis. test tanpa HTTP injection), tabel tidak akan ada

---

## 4. File Migrasi yang Tidak Relevan di Test

### `migrations/sqlite/002_add_class_advisor_id.ts`
- File tambahan yang hanya alter table `classes`
- Di-import di `migrations/sqlite/index.ts` sebagai `addClassAdvisor`
- Tidak ada versi MySQL karena ini ad-hoc alteration, bukan base schema

### `migrations/002_add_class_advisor_id.ts` (root) → **SUDAH DIHAPUS**
- File ini pernah ada di root, lalu dihapus di commit terakhir
- Sekarang tidak mempengaruhi apa-apa karena root migrations kosong

---

## 5. Kesimpulan & Rekomendasi

### Yang Perlu Dilakukan (Tanpa Implementasi):

1. **Fix `knexfile.js` migrations.directory → `migrations/mysql/`**
   ```js
   migrations: {
     tableName: 'migrations',
     directory: path.join(__dirname, 'migrations', 'mysql'),  // ← CHANGE
   }
   ```

2. **Atau hapus `migrations/` sub-folders sepenuhnya** dan kembalikan 14 base migration ke root `migrations/` dengan syntax ESM yang kompatibel.

3. **Pertahankan test SQLite di `tests/helper.ts`** — cara lazy `ensureSchema` ini sudah berfungsi dan tidak perlu `tests/setup.ts`.

4. **Hapus atau dokumentasikan `tests/setup.ts`** — file ini mendefinisikan `setup()` yang tidak dipanggil oleh Vitest sama sekali (tidak ada `setupFiles` di vitest config).

5. **Database test MySQL:**
   - User berencana membuat DB `zekolah-test`
   - CLI `migrate.js` sudah mendukung `NODE_ENV=development` → akan pakai `zekolah-dev`
   - Jika ingin run migration di test DB, perlu override `process.env.DB_NAME` atau tambah env `test` di `knexfile.js`

---

## 6. Checklist Konsistensi

| Item | Status |
|------|--------|
| `knexfile.js` → `migrations.directory` point ke folder yang ada file-nya | ❌ BROKEN (point ke root yang kosong) |
| `scripts/migrate.js` → bisa run migration untuk development DB | ⚠️ Works tapi tidak ada migration yang di-apply |
| `src/config/database.ts` → environment switching MySQL ↔ SQLite | ✅ OK |
| Test suite → schema tersedia saat test berjalan | ✅ OK (via ensureSchema lazy loading) |
| `tests/setup.ts` → dipanggil oleh Vitest | ❌ NEVER CALLED |
| Migration MySQL files di `migrations/mysql/` → format ESM | ✅ OK |
| Migration SQLite files di `migrations/sqlite/` → format CommonJS | ✅ OK |

---

*Observasi ini dibuat untuk mencegah implementasi otomatis. Tindakan perbaikan akan dibahas terpisah.*
