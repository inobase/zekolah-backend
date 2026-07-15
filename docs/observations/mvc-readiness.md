# Observasi: Kesiapan Implementasi MVC

> Tanggal: 2026-07-15
> Sumber: Hasil review terhadap `docs/discussions/mvc-architecture.md` + kondisi codebase terkini

---

## Ringkasan Eksekutif

Desain MVC yang dibahas di `mvc-architecture.md` **secara umum siap diimplementasikan**, namun ada **6 hambatan kesiapan (readiness blocker)** yang harus ditangani sebelum atau bersamaan dengan refactor. Tanpa menyelesaikannya, refactor akan menambah utang teknis, bukan menguranginya.

| Aspek | Status | Risiko |
|-------|--------|--------|
| Struktur folder MVC | ✅ Siap | — |
| Dependensi Knex, Zod, TypeScript | ✅ Sudah terpasang | — |
| Singleton `getKnex()` | ✅ Siap dipakai repository | — |
| TypeScript strict mode | ✅ Aktif (`strict: true`) | — |
| Validasi input | ⚠️ Sebagian besar belum ada Zod | Tinggi |
| Test infrastructure (Vitest) | ✅ Sudah berjalan dengan SQLite | — |
| `errorHandler` | ✅ Sudah pisah | — |
| Idempotency / business logic | ❌ Tidak ada | Sedang |
| Naming convention route file | ⚠️ `id` di-parse sebagai `number` di route, padahal DB `uuid/string` | Tinggi |
| Tech debt (pino, passport-local, dayjs+moment) | ⚠️ Berlaku, tidak mengganggu MVC | Rendah |

---

## 1. Temuan: Kode Routes Saat Ini

Route `student.routes.ts` adalah representasi pola yang dipakai semua module. Catatan kritis:

### A. Tidak ada validasi Zod
```typescript
const body = request.body as Record<string, unknown>;
const [id] = await knex('students').insert({ ...body, ... });
```
Body langsung di-cast dan dimasukkan ke DB. Tidak ada whitelist field, tidak ada validasi tipe. **Semua input bisa masuk mentah ke database**.

### B. Tidak ada business logic layer
- Tidak ada pengecekan duplikat `student_number`
- Tidak ada validasi FK (mis. `class_id` ada atau tidak)
- Tidak ada transaksi untuk multi-step write
- Tidak ada kalkulasi turunan (usia, status, dsb.)

### C. Tipe parameter `id` inkonsisten
```typescript
const { id } = request.params as { id: number };
```
Schema memakai UUID/string, tapi di-cast ke `number`. **Akan menjadi bug** ketika migration UUID diaktifkan di production. Ini harus diputuskan dulu: `id` bertipe apa? UUID atau auto-increment?

### D. Tidak ada error handling per route
Semua error mentah dilempar ke `errorHandler` global. Pola error service-layer (`STUDENT_NUMBER_ALREADY_EXISTS`) seperti di diskusi belum ada.

### E. `updated_at` di-set manual di setiap route
```typescript
.update({ ...body, updated_at: new Date() });
```
Pattern yang tersebar di banyak tempat. Lebih baik ditangani repository atau trigger DB.

---

## 2. Kesiapan Layer per Layer

### 2.1 Repository Layer — ✅ SIAP
- Singleton `getKnex()` sudah tersedia di `src/config/database.ts`
- Knex Query Builder tersedia (`knex('table').where(...).select(...)`)
- Pola `knex('students').join('users', ...).whereLike(...)` sudah dipakai di route saat ini → tinggal dipindah ke repository

**Contoh perpindahan langsung:**
```typescript
// Saat ini (di route):
let query = knex('students').join('users', 'students.user_id', 'users.id');
if (search) query.whereLike('users.name', `%${search}%`);

// Setelah refactor (di repository):
class StudentRepository {
  async search(filter: StudentFilter) {
    const q = this.knex('students').join('users', 'students.user_id', 'users.id');
    if (filter.search) q.whereLike('users.name', `%${filter.search}%`);
    return q;
  }
}
```

### 2.2 Service Layer — ⚠️ SIAP DENGAN CATATAN
- Folder belum ada, harus dibuat baru di `src/services/`
- Pattern business logic yang ditulis di diskusi (`STUDENT_NUMBER_ALREADY_EXISTS`, `STUDENT_HAS_SUBMISSIONS`) **belum ada** di kode manapun. Ini adalah pekerjaan baru, bukan migrasi
- `errorHandler` saat ini belum membedakan error business vs error sistem. **Perlu ditambah tipe error kustom** (mis. `class AppError extends Error`) agar service bisa melempar error dengan kode yang konsisten

### 2.3 Controller Layer — ⚠️ SIAP DENGAN CATATAN
- Folder belum ada
- Pattern handler tipis seperti di diskusi **sudah compatible** dengan Fastify (`(req, reply) => { ... }`)
- Tidak ada perubahan signifikan di `app.ts`/`index.ts` yang dibutuhkan — register ulang route saja

### 2.4 Model Layer — ⚠️ SEBAGIAN SIAP
- Folder belum ada
- TypeScript interface bisa langsung dibuat (zero overhead)
- **Class-based entity tidak disarankan** untuk fase awal. Alasan:
  - Butuh `constructor` panjang dengan banyak parameter
  - `toJSON()` + parsing manual dari DB result akan menambah boilerplate
  - Saat ini tidak ada method bisnis yang reusable
- **Rekomendasi revisi keputusan 2:** Mulai dengan **Interface only** untuk SEMUA model. Class entity baru dibuat kalau ada business logic yang benar-benar butuh encapsulation (mis. `Submission` dengan status flow `draft → submitted → graded`)

### 2.5 Validator Layer — ⚠️ SEBAGIAN SIAP
- Folder belum ada
- Zod sudah terinstall (`zod@^3.24.0`)
- Skema di diskusi (`CreateStudentSchema`, dst.) **belum ada** di kode manapun. Saat ini `request.body` di-cast tanpa validasi
- **Ini blocking utama** untuk keamanan. Validasi harus dibuat bersamaan dengan controller baru

### 2.6 Routes — ✅ SIAP DENGAN PERUBAHAN MINOR
- File route akan berubah dari "isi segalanya" jadi "registrasi + delegasi"
- `app.addHook('onRequest', app.authenticate)` di setiap file **bisa dihapus** dan dipindahkan ke controller atau preHandler inline (lihat contoh di diskusi)

---

## 3. Issue Lintas-Layer yang Harus Diputuskan

### 3.1 Tipe Primary Key: `number` atau `uuid`?

**Observasi dari kode:**
```typescript
// student.routes.ts
const { id } = request.params as { id: number };
```
Tapi schema/migrations menggunakan UUID/string untuk hampir semua tabel (lihat `knexfile.js`/migration file).

**Konsekuensi jika tidak diputuskan:**
- Repository yang baru akan bingung: `where({ id })` butuh string atau number?
- Type Zod schema tidak bisa dibuat konsisten

**Rekomendasi:** Standarkan ke **UUID string** untuk semua primary key kecuali tabel auth/log. Update semua route `request.params`.

### 3.2 Error Handling Service Layer

`errorHandler` saat ini menangani:
- `ZodError` (akan aktif setelah ada validator)
- `FastifyJwtAuthError`
- Knex error code tertentu

**Belum menangani:**
- Custom business error (mis. `STUDENT_NUMBER_ALREADY_EXISTS`)
- Validation bisnis (mis. `STUDENT_HAS_SUBMISSIONS`)
- Conflict (409), Not Found (404) di level service

**Rekomendasi:** Buat `src/utils/AppError.ts` dengan:
```typescript
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```
Lalu tambahkan branch di `errorHandler` untuk `error.name === 'AppError'`.

### 3.3 Transaksi Database

Service seperti `SubmissionService.create()` (jika nanti ada) butuh transaksi:
- Insert ke `submissions`
- Update `assignments.submitted_count`
- Insert ke `notifications`

Saat ini **tidak ada transaksi** di kode manapun. Knex punya `knex.transaction(async (trx) => {...})`. Ini belum dipakai.

**Rekomendasi:** Saat membuat service, identifikasi operasi yang butuh atomisitas dan pakai `knex.transaction`.

---

## 4. Tech Debt yang Tidak Menghalangi tapi Perlu Dicatat

Dari `1_0_2.md` bagian "Known Issues":

| Issue | Dampak ke MVC | Tindakan |
|-------|---------------|----------|
| `passport-local` masih di `package.json` meski tidak dipakai | Tidak mengganggu | Bersihkan saat refactor |
| `pino` & `pino-pretty` terinstall tapi tidak dipakai | Logger `utils/logger.ts` sudah pakai console | Bisa dibiarkan |
| `dayjs` dan `moment` dua-duanya terinstall | Tidak mengganggu | Pilih salah satu |
| Versi hardcoded `"1.0.0"` di `index.ts` | Tidak mengganggu | Baca dari `package.json` |
| Belum ada rate limiting | Tidak mengganggu | Plugin terpisah |
| Belum ada Swagger/OpenAPI | Akan mengganggu validator→dokumentasi | Bisa pakai `fastify-type-provider-zod` |

**Catatan:** Tech debt ini **tidak boleh** dilakukan bersamaan dengan refactor MVC. Buat changelog `1.0.4` atau `1.0.3` terpisah.

---

## 5. Strategi Migrasi yang Disarankan

### Pola Migrasi per Modul

```
1. Pilih 1 modul (rekomendasi: auth, lalu student)
2. Buat validator schema (Zod) — di sini banyak behavior baru
3. Buat model interface (typescript)
4. Buat repository (pindah Knex query dari route)
5. Buat service (business logic — bisa kosong di awal)
6. Buat controller (handler tipis)
7. Update route (hanya registrasi)
8. Jalankan test existing — pastikan 200 OK sama
9. Baru pindah ke modul berikutnya
```

### Prioritas Urutan Modul

| Urutan | Modul | Alasan |
|--------|-------|--------|
| 1 | `auth` | Paling sederhana, jadi baseline pattern |
| 2 | `school` | Bergantung ke `auth` (created_by user), sederhana |
| 3 | `user` | Tergantung ke `auth`, pattern mirip school |
| 4 | `student` | Lebih kompleks (relasi ke class & user), jadi baseline CRUD |
| 5 | `class` | Bergantung ke student, school, teacher |
| 6 | `teacher` | Mirip student |
| 7 | `subject` | Sederhana |
| 8 | `academic-year` | Sederhana |
| 9 | `teaching-assignment` | Bergantung teacher+class+subject+academic-year |
| 10 | `attendance` | Bergantung student+subject+teaching-assignment |
| 11 | `assignment` | Bergantung class+subject+teacher |
| 12 | `submission` | Bergantung assignment+student |
| 13 | `grade` | Bergantung student+subject+assessment |

### Strategi: Coexistence atau Big Bang?

**Rekomendasi: Coexistence (modul per modul)**

- Buat folder MVC (`controllers/`, `services/`, dst.) tapi **biarkan route lama berjalan**
- Untuk setiap modul yang direfactor:
  - File route baru me-register controller baru
  - File route lama **dihapus** setelah test passed
- Hindari big-bang: semua modul sekaligus → risiko regression tinggi

---

## 6. Checklist Kesiapan Sebelum Implementasi

Sebelum mulai refactor, selesaikan dulu:

- [ ] **Keputusan:** Primary key UUID vs auto-increment — finalisasi
- [ ] **Buat:** `src/utils/AppError.ts` untuk custom error
- [ ] **Update:** `src/middlewares/errorHandler.ts` untuk handle `AppError`
- [ ] **Buat:** Folder kosong `src/controllers/`, `src/services/`, `src/repositories/`, `src/models/`, `src/validators/`
- [ ] **Pastikan:** `npm run type-check` lulus 100% (saat ini mungkin ada warning karena cast `request.body`)
- [ ] **Pastikan:** `npm run test` lulus 100% sebagai baseline
- [ ] **Dokumentasikan:** Pattern file header comment di satu modul pertama sebagai template

---

## 7. Revisi Minor untuk Diskusi MVC

Setelah observasi, ada **2 revisi kecil** yang disarankan ke `mvc-architecture.md`:

### Revisi 1 — Model Layer
Mulai dengan **Interface only** untuk semua model. Class entity ditambahkan nanti **hanya** jika ada business logic yang:
- Butuh validasi constructor (mis. status transition)
- Reusable di banyak service (mis. kalkulasi nilai akhir)

**Alasan:** Interface lebih ringan, dan tidak ada method bisnis yang reusable saat ini. Class entity tanpa method = overhead tanpa manfaat.

### Revisi 2 — Tambah Layer: Error Kustom
Tambahkan di diskusi:
- `src/utils/AppError.ts` — Custom error class
- Update `errorHandler` untuk handle `AppError`

Tanpa ini, service tidak bisa melempar error bisnis dengan rapi.

---

## 8. Estimasi Kompleksitas (Relatif)

| Modul | Kompleksitas | Catatan |
|-------|-------------|---------|
| auth | Rendah | Pattern login/register |
| school | Rendah | CRUD dasar |
| user | Rendah | Mirip school |
| student | Sedang | Ada relasi + search/filter |
| class | Sedang | Composite key class_students |
| teacher | Sedang | Mirip student |
| subject | Rendah | CRUD dasar |
| academic-year | Rendah | CRUD dasar |
| teaching-assignment | Tinggi | Multi-FK + uniqueness |
| attendance | Sedang | Filter tanggal + agregasi |
| assignment | Sedang | Relasi ke class+subject |
| submission | Tinggi | Transaction + file upload |
| grade | Sedang | Perhitungan nilai |

**Total:** 13 modul, ~40-60 file baru (controller + service + repository + validator + interface per modul).

---

## 9. Rekomendasi Final

✅ **Lanjut implementasi MVC** dengan revisi minor:

1. **Revisi diskusi:**
   - Model Layer: Interface only dulu, Class entity nanti
   - Tambah `AppError` utility + update `errorHandler`
   - Finalisasi keputusan primary key (UUID/string)

2. **Urutan eksekusi:** auth → school → user → student → class → teacher → subject → academic-year → teaching-assignment → attendance → assignment → submission → grade

3. **Strategi:** Modul per modul (coexistence), bukan big-bang. Setelah setiap modul, jalankan `npm run type-check` dan `npm run test`.

4. **Buat changelog terpisah** untuk tech debt (passport-local, dayjs/moment, dll.) — tidak digabung dengan refactor MVC.

---

## Status

- [x] Review dokumen diskusi MVC
- [x] Review struktur folder project saat ini
- [x] Review pola route saat ini (`student.routes.ts` sebagai sampel)
- [x] Review `database.ts`, `app.ts`, `index.ts`, `errorHandler.ts`
- [x] Review `package.json`, `tsconfig.json`
- [x] Review observasi sebelumnya (`sqlite-testing-observasi.md`)
- [x] Identifikasi readiness blockers
- [x] Beri rekomendasi strategi migrasi
- [ ] Keputusan final dari user
- [ ] Mulai implementasi