# Observasi — Dependencies Yang Bisa Dihapus

## Tanggal Observasi
2026-07-16

## Metodologi
- Scan seluruh kode sumber (src/, scripts/, migrations/, tests/) untuk import/require dari setiap dependency
- Cek apakah package hanya ada di `package.json` tapi tidak dipakai sama sekali
- Cek juga devDependencies yang tidak dipakai dalam develop/test workflow

---

## A. PRODUCTION DEPENDENCIES BISA DIHAPUS

### ✅ `moment` — TIDAK DIGUNAKAN
- Tidak ada satu pun import/require `moment` di seluruh kode
- **Impact:** 0 — file apa pun tidak menggunakannya
- **Reason:** Kemungkinan ditambahkan untuk fitur yang dibatalkan atau direncanakan tapi tidak pernah diimplementasi

### ✅ `dayjs` — TIDAK DIGUNAKAN
- Tidak ada satu pun import/require `dayjs` di seluruh kode
- **Impact:** 0 — file apa pun tidak menggunakannya
- **Reason:** Kemungkinan direncanakan sebagai pengganti `moment` tapi tidak pernah dipakai

### ✅ `passport-local` — TIDAK DIGUNAKAN
- Tidak ada satu pun import/require `passport-local` di seluruh kode
- **Impact:** 0 — autentikasi menggunakan custom JWT (bcryptjs + fastify-jwt), bukan Passport.js
- **Reason:** Ditambahkan mungkin untuk fitur login tradisional tapi akhirnya pakai JWT strategy

### ✅ `pino` — TIDAK DIGUNAKAN
- Tidak ada import `pino` di seluruh kode
- **Impact:** 0 — logging saat ini pakai `console.log` atau logger kustom di `src/utils/logger.ts`
- **Catatan:** Ada komentar di `src/utils/logger.ts` yang mengatakan "Replace with pino in production" tapi belum pernah diimplementasi
- **Reason:** Direncanakan untuk production logging tapi belum diwujudkan

### ✅ `pino-pretty` — TIDAK DIGUNAKAN
- Tidak ada import `pino-pretty` di seluruh kode
- **Impact:** 0 — hanya relevan jika `pino` dipasang
- **Reason:** Adanya karena pino tidak pernah dipasang

### ✅ `uuid` — TIDAK DIGUNAKAN
- Tidak ada import `uuid` di seluruh kode
- **Impact:** 0 — tidak ada UUID yang di-generate via library ini
- **Reason:** Mungkin direncanakan untuk generate ID tapi tidak pernah dipakai

### ✅ `fastify-plugin` — TIDAK DIGUNAKAN
- Tidak ada import `fastify-plugin` di seluruh kode
- **Impact:** 0 — semua Fastify plugin terdaftar langsung via `register()`
- **Reason:** Biasanya dipakai untuk wrap plugin agar auto-expose methods/attributes, tapi tidak pernah dipakai di proyek ini

---

## B. DEV DEPENDENCIES BISA DIHAPUS

### ✅ `@types/better-sqlite3` — TIDAK DIGUNAKAN
- Tidak ada file TypeScript yang meng-import `better-sqlite3`
- **Impact:** 0 — hanya ada string literal `'better-sqlite3'` di `scripts/check-tables.js` (JavaScript, bukan TS)
- **Reason:** Script `check-tables.js` mengecek string `client === 'better-sqlite3'` tapi tidak benar-benar import library ini

### ✅ `@types/express` — TIDAK DIGUNAKAN
- Tidak ada express di proyek ini (Fastify yang dipakai)
- **Impact:** 0 — tipe Express.js tidak pernah dibutuhkan
- **Reason:** Kemungkinan sisa dari boilerplate atau template yang awalnya pakai Express

### ✅ `@types/supertest` — TIDAK DIGUNAKAN
- Tidak ada import `supertest` di seluruh kode
- **Impact:** 0 — testing memakai `app.inject()` bawaan Fastify (Plugin Test Helper), bukan supertest
- **Reason:** Template testing awal pakai supertest, pindah ke Fastify inject helper tapi types-nya tertinggal

### ✅ `@types/uuid` — TIDAK DIGUNAKAN
- Tidak ada import `uuid` di seluruh kode (lihat poin produksi di atas)
- **Impact:** 0 — tidak ada tipe UUID yang dibutuhkan
- **Reason:** Karena `uuid` tidak dipakai, types-nya juga tidak berguna

---

## C. DEPENDENCIES YANG PERLU PERTIMBANGAN

### ⚠️ `better-sqlite3` — DEV DEPENDENCY
**Status:** Hanya ada di `scripts/check-tables.js` sebagai **string detection**, bukan actual import.

```javascript
// Di scripts/check-tables.js
if (client === 'better-sqlite3') { ... }  // string check, bukan require()
```

Script ini mengecek apakah DB client-nya sqlite3, tapi karena proyek cuma pakai MySQL2, kondisi ini tidak pernah true.

**Recommendation:** Hapus dari devDependencies. Jika nanti butuh untuk testing lokal SQLite, bisa ditambahkan kembali.

### ⚠️ `supertest` — DEV DEPENDENCY
**Status:** Tidak ada import di seluruh kode. Testing pakai `app.inject()` dari Fastify core.

```typescript
// tests/helper.ts
import type { FastifyInstance } from 'fastify';

const injectHelper = app.inject.bind(app);  // bukan supertest
```

**Recommendation:** Hapus. Tidak ada yang memakai.

### ⚠️ `@types/bcryptjs` — PERLU VERIFIKASI
**Status:**bcryptjs 2.4.x tidak punya bundled types, jadi `@types/bcryptjs` mungkin dibutuhkan untuk TypeScript compilation.

Namun, bcryptjs v3+ sudah include types sendiri. Proyek ini locked di `2.4.3`, jadi types masih diperlukan.

**Recommendation:** Pertahankan sampai upgrade bcryptjs ke v3+. Atau kalau mau bersih, hapus dan ganti `any` type.

---

## D. SUMMARY TABLE

| Package | Type | Alasan | Estimated Bundle Size |
|---------|------|--------|----------------------|
| `moment` | deps | Tidak dipakai sama sekali | ~70 KB |
| `dayjs` | deps | Tidak dipakai sama sekali | ~5 KB |
| `passport-local` | deps | Auth pakai JWT, bukan Passport | ~5 KB |
| `pino` | deps | Logging pakai logger kustom | ~30 KB |
| `pino-pretty` | deps | Hanya relevan jika pino ada | ~10 KB |
| `uuid` | deps | Tidak dipakai sama sekali | ~3 KB |
| `fastify-plugin` | deps | Plugin register langsung | ~2 KB |
| `@types/better-sqlite3` | devDeps | Tidak ada TS import | ~1 KB |
| `@types/express` | devDeps | Framework-nya Fastify | ~1 KB |
| `@types/supertest` | devDeps | Pakai Fastify inject | ~1 KB |
| `@types/uuid` | devDeps | uuid tidak dipakai | ~1 KB |
| `better-sqlite3` | devDeps | String check di JS script | ~2 MB |
| `supertest` | devDeps | Pakai Fastify inject | ~50 KB |
| **TOTAL (prod)** | — | — | ~125 KB |
| **TOTAL (dev)** | — | — | ~2.2 MB |

**Estimasi:** Bisa kurangi ~1.2 MB production size dan ~2.2 MB dev size = total ~3.4 MB lebih ringan.

---

## E. LANGKAH SEBELUM HAPUS

Sebelum melakukan `npm uninstall`, pastikan:

1. **Review manual** — Baca ulang file yang mencurigakan (misal `src/utils/logger.ts` komentar tentang pino)
2. **Cek future roadmap** — Apakah dayjs/pino sedang direncanakan untuk implementasi berikutnya?
3. **Backup `package-lock.json`** — Sebelum uninstall, commit lock file dulu
4. **Run tests setelah uninstall** — Pastikan tidak ada broken import
5. **Update `package.json` manually** — Jangan gunakan `sed` atau regex, hapus satu per satu untuk traceability

**Manual uninstall command:**
```bash
# Production
npm uninstall moment dayjs passport-local pino pino-pretty uuid fastify-plugin

# Dev
npm uninstall --save-dev @types/better-sqlite3 @types/express @types/supertest @types/uuid better-sqlite3 supertest
```

---

## F. CATATAN TAMBAHAN

1. **MySQL2 vs Knex** — `mysql2` ter-install secara implicit lewat `knex` dependency, tapi secara eksplisit dipakai di `src/config/database.ts` (`client: 'mysql2'`). JANGAN dihapus.

2. **dotenv** — Meskipun hanya dipakai via dotenvx CLI injection, juga direferensi di `scripts/migrate.js` dan `scripts/check-tables.js`. JANGAN dihapus.

3. **bcryptjs** — Dipakai di `src/services/auth.service.ts` untuk hash/verify password. JANGAN dihapus.

4. **knex** — Digunakan secara ekstensif di repository pattern. JANGAN dihapus.

5. **zod** — Digunakan di semua validator. JANGAN dihapus.
