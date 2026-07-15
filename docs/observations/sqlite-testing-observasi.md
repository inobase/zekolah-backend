# Observasi: SQLite In-Memory untuk Testing

## Masalah Utama

Project ini menggunakan **MySQL** secara hardcoded di `src/config/database.ts`. Untuk menjalankan test integration tanpa bergantung pada server MySQL eksternal, perlu beralih ke **SQLite in-memory**. Namun ada tantangan signifikan:

---

## 1. Dialect Differences (MySQL vs SQLite)

| Fitur | MySQL (Knex) | SQLite | Status |
|-------|-------------|--------|--------|
| `timestamp('col').defaultTo(knex.fn.now())` | ✅ `DEFAULT CURRENT_TIMESTAMP` | ❌ Tidak support `fn.now()` default pada TIMESTAMP | **BREAKING** |
| `timestamps(true, true)` | ✅ Adds `created_at`, `updated_at` with defaults | ⚠️ Adds columns but no auto default | **PARTIAL** |
| `.unsigned()` | ✅ Explicit UNSIGNED INT | ⚠️ No-op on some dialects | **SAFE** |
| `FOREIGN KEY` constraints | ✅ Full support | ✅ Supported but often disabled by default | **NEEDS ATTENTION** |
| `CASCADE` / `SET NULL` | ✅ | ✅ | **SAFE** |
| `.index([...])` | ✅ | ✅ | **SAFE** |
| `UNIQUE` constraint | ✅ | ✅ | **SAFE** |
| `DECIMAL` | ✅ | ⚠️ Uses REAL under the hood | **SAFE** |
| `DATE` vs `DATETIME` | ✅ Separate types | ⚠️ All stored as TEXT/REAL | **SAFE** |
| `charset utf8mb4` | ✅ Connection config | ❌ Not needed | **IGNORE** |

---

## 2. Perubahan yang Diperlukan di `database.ts`

### A. Override driver berdasarkan env

```typescript
// src/config/database.ts
import Knex, { Knex as KnexType } from 'knex';
import { config } from '.';

let knexInstance: KnexType | null = null;

export const getKnex = (): KnexType => {
  if (!knexInstance) {
    const isTest = process.env.NODE_ENV === 'test';

    const connection = isTest
      ? ':memory:'
      : {
          host: config.dbHost,
          port: config.dbPort,
          database: config.dbName,
          user: config.dbUser,
          password: config.dbPass,
          charset: 'utf8mb4',
          timezone: '+07:00',
        };

    knexInstance = Knex({
      client: isTest ? 'better-sqlite3' : 'mysql2',
      connection,
      useNullAsDefault: true, // hide mysql2 extras like pool config in test
      // SQLite-specific settings
      ...(isTest && {
        pool: { afterCreate: (conn, cb) => {
          conn.pragma('journal_mode = WAL');
          conn.pragma('foreign_keys = 1');
          cb(null, conn);
        }},
      }),
    });
  }
  return knexInstance;
};
```

### B. `closeDatabase()` perlu handle kedua dialect

```typescript
export const closeDatabase = async (): Promise<void> => {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
};
```

---

## 3. Migrasi Schema (KONFLIK UTAMA)

Migration saat ini (`migrations/001_create_base_tables.ts`) menggunakan syntax MySQL-only:

```typescript
// ❌ BREAKING: knex.fn.now() tidak bekerja di SQLite
table.timestamp('created_at', true).defaultTo(knex.fn.now());
table.timestamp('updated_at', true).defaultTo(knex.fn.now());
```

### Opsi 1: Buat migration alternatif untuk SQLite (RECOMMENDED)

Duplikasi migration file khusus untuk SQLite dengan perubahan:

```typescript
// migrations/001_create_base_tables_sqlite.ts
exports.up = async (knex) => {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password', 255).notNullable();
    table.string('name', 200).notNullable();
    table.string('role', 50).defaultTo('student');
    // ...fields yang sama...

    // ✅ SQLite-compatible: use .dateTime() with .notNullable()
    // Set default via trigger or application-level
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });
  // ...dan seterusnya untuk setiap table
};
```

### Opsi 2: Abaikan default timestamp di aplikasi

Ganti semua `knex.fn.now()` di route handlers menjadi `new Date()`:

```typescript
// Sebelum (MySQL-specific)
await knex('users').insert({
  email: data.email,
  password: hash,
  name: data.name,
  created_at: knex.fn.now(),  // ❌
  updated_at: knex.fn.now(),  // ❌
});

// Sesudah (universal)
await knex('users').insert({
  email: data.email,
  password: hash,
  name: data.name,
  created_at: new Date(),      // ✅
  updated_at: new Date(),      // ✅
});
```

### Opsi 3: Gunakan `knex.raw()` untuk fallback

```typescript
// Cross-dialect compatible
const NOW = (knex: KnexType) => knex.raw('CURRENT_TIMESTAMP');
```

---

## 4. Dependency Tambahan

```bash
npm install --save-dev better-sqlite3
```

`better-sqlite3` jauh lebih cepat daripada `sqlite3` (native binding).

---

## 5. Setup File Structure yang Diusulkan

```
tests/
├── setup.ts              # Env vars + noop logger (sudah ada)
├── helper.ts             # createTestApp / closeAllApps (sudah ada)
├── health.test.ts        # Health/Ping tests (sudah ada)
└── fixtures/
    ├── seedUsers.ts      # Factory users untuk test auth
    └── seedSchools.ts    # Factory sekolah untuk test routes lain
```

---

## 6. Estimasi Effort

| Task | Estimasi | Keterangan |
|------|----------|------------|
| Install `better-sqlite3` | ~5 menit | |
| Modifikasi `database.ts` | ~15 menit | Conditional dialect |
| Update migration `knex.fn.now()` | ~1 jam | ~15-20 table |
| Update route handlers | ~30 menit | Semua query pakai `new Date()` |
| Update `tests/setup.ts` | ~5 menit | Set NODE_ENV=test + SQLite |
| Verifikasi semua test | ~20 menit | |
| **Total** | **~2.5 jam** | |

---

## 7. Alternatif Tanpa SQLite

Jika effort terlalu tinggi, pertimbangkan opsi berikut:

### A. Mock `getKnex()` (Sudah dipakai di health.test.ts)
- Test hanya validasi Fastify routing + response shape
- Database di-mock: `jest.spyOn(database, 'getKnex').mockReturnValue(mockKnex)`

### B. Real MySQL Docker Container
- Pakai `docker-compose` dengan MySQL container yang di-spin per test suite
- Schema akurat, tapi butuh Docker

### C. Test-only `.env.test`
- Tetap pakai MySQL real, cuma DB berbeda `zekolah_test`
- Dibersihkan setiap suite (`DROP DATABASE IF EXISTS`)
- Butuh MySQL running

---

## 8. Kesimpulan

**Rekomendasi: Opsi C (MySQL real test DB)** jika:
- Migration saat ini tidak ingin diubah
- Developer sudah punya MySQL running locally
- Kecepatan test bukan concern utama

**Rekomendasi: Implementasi SQLite** jika:
- Ingin test super cepat (< 1 detik untuk seluruh suite)
- Siap refaktor migration & route handlers
- CI/CD environment tidak perlu install MySQL
