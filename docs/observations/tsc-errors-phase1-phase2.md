# Observasi — TypeScript Errors: Phase 1 & 2 Controllers

> **Tanggal:** 2026-07-17  
> **Sumber:** Output `npm run type-check` / `tsc --noEmit`  
> **Status:** 9 errors dalam 9 files — semua dari perubahan Phase 1 (school context injection)

---

## Ringkasan

Setelah implementasi Phase 1 & 2, terdapat **9 TypeScript compilation errors** tersebar di **9 file controller**. Semua error terkait dengan **injeksi `school_id` dari `req.activeSchoolId`** yang introduced pada Phase 1.

**Tidak ada error dari Phase 3** — semua file baru (routes, controller, service, validator untuk role management) kompilasi bersih.

---

## Kategori Error

### Kategori A: `TS2345` — `school_id: null` tidak assignable ke `school_id?: number`

**Terjadi di controller yang melakukan `as QueryFilterType` terhadap `req.query`, lalu melakukan spread:**

```typescript
// Pattern: req.query sudah di-cast ke filter type → spread aman
const query = req.query as AcademicYearFilterInput
const filter = { ...query, school_id: req.activeSchoolId } // ← error di sini
```

**Masalah:**
- `req.activeSchoolId` bertipe `number | null | undefined` (dari middleware `authenticate`)
- `AcademicYearFilterInput.school_id` bertipe `number | undefined` (dari zod schema `.optional()`)
- `null` tidak assignable ke `undefined` → **TS2345**

**File affected:**
| # | File | Line | Detail |
|---|------|------|--------|
| 1 | `src/controllers/academic-year.controller.ts` | 25 | `{ school_id: number \| null \| undefined }` → `{ school_id?: number }` |
| 2 | `src/controllers/class.controller.ts` | 25 | Sama seperti di atas + `academic_year_id` |
| 3 | `src/controllers/student.controller.ts` | 25 | `{ school_id: number \| null \| undefined }` → `{ school_id?: number }` |
| 4 | `src/controllers/teacher.controller.ts` | 25 | Sama seperti student |

### Kategori B: `TS2698` — `spread types may only be created from object types`

**Terjadi di controller yang langsung spread `req.query` TANPA casting terlebih dahulu:**

```typescript
// Pattern: req.query spread langsung tanpa cast → error
const filter = { ...req.query, school_id: req.activeSchoolId } as AssignmentFilterInput
```

**Masalah:**
- `req.query` bertipe `RawServerOutgoingMessage.QuerystringParameters` (dari Fastify generic type)
- Type ini adalah `Record<string, string | string[] | undefined>` atau `unknown` dalam konteks FastifyRequest tanpa decorators
- JavaScript spread operator (`...`) tidak bisa digunakan pada type yang bukan `object` → **TS2698**

**File affected:**
| # | File | Line | Pattern |
|---|------|------|---------|
| 1 | `src/controllers/assignment.controller.ts` | 23 | `{ ...req.query, school_id: req.activeSchoolId }` |
| 2 | `src/controllers/attendance.controller.ts` | 23 | Sama |
| 3 | `src/controllers/grade.controller.ts` | 23 | Sama |
| 4 | `src/controllers/subject.controller.ts` | 18 | Sama |
| 5 | `src/controllers/submission.controller.ts` | 23 | Sama |

---

## Root Cause Analysis

### 1. `req.activeSchoolId` tipe: `number | null | undefined`

Dari middleware `authenticate` di `src/app.ts`:

```typescript
// Setelah authentication, set school context
request.activeSchoolId = schoolIdFromJwtOrHeader ?? null
```

Middleware set `activeSchoolId` ke `number | null` berdasarkan prioritas:
1. Header `x-school-id`
2. JWT payload `school_id`
3. Default `null` jika tidak ditemukan

Ketika controller spread value ini ke filter object, TypeScript menganggap nilai `null` mungkin ada → mismatch dengan zod schema yang `.optional()` (berarti `T | undefined`, bukan `T | null | undefined`).

### 2. `req.query` perlu casting sebelum spread

Beberapa controller menggunakan `req.query as SomeFilterType` (safe), sebagian lagi langsung spread `req.query` (unsafe). Tidak konsisten di treatment.

---

## Solusi yang Direkomendasikan

### Fix A: Null-coalescing `school_id` dari `req.activeSchoolId`

Ganti:
```typescript
const filter = { ...query, school_id: req.activeSchoolId }
```

Menjadi:
```typescript
const filter = { ...query, school_id: req.activeSchoolId ?? undefined }
```

Atau buat helper function:
```typescript
const sanitizeFilter = <T extends Record<string, unknown>>(obj: T): T => {
  // Convert null values to undefined untuk zod .optional() compatibility
  for (const key in obj) {
    if (obj[key] === null) obj[key] = undefined
  }
  return obj
}
```

### Fix B: Cast `req.query` sebelum spread (untuk Kategori B)

Ganti:
```typescript
const filter = { ...req.query, school_id: req.activeSchoolId } as AssignmentFilterInput
```

Menjadi:
```typescript
const query = req.query as Record<string, unknown>
const filter = { ...query, school_id: req.activeSchoolId } as AssignmentFilterInput
```

Atau:
```typescript
const filter = { ...(req.query as Record<string, unknown>), school_id: req.activeSchoolId } as AssignmentFilterInput
```

### Fix C (Long-term): Ubah Zod Schemas untuk Accept `null`

Ubah filter schemas dari `.optional()` menjadi `.optional().nullable()`:

```typescript
// Sebelum
school_id: z.coerce.number().int().positive().optional()

// Sesudah
school_id: z.coerce.number().int().positive().optional().nullable()
```

Ini akan membuat type `school_id?: number | null` yang compatible dengan `req.activeSchoolId` yang bisa `null`. **Namun** ini memerlukan perubahan di 6+ validator files dan 9 controller files.

---

## Rekomendasi Prioritas

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
| **P0** | Fix 4 error Kategori A — null-coalesce `school_id` | Build broken | 2 min |
| **P0** | Fix 5 error Kategori B — cast `req.query` before spread | Build broken | 3 min |
| **P1** | Ubah semua filter zod schemas accept `.nullable()` | Preventive | 15 min |
| **P2** | Buat `sanitizeFilter()` utility untuk konsistensi | Code quality | 5 min |

**Total effort P0 fix: ~5 menit.**

---

## Catatan Tambahan

- Phase 3 (Role Management API) **tidak menghasilkan error TypeScript**. Semua 6 file baru (validator, controller, service, routes) dan perubahan di `index.ts` compile clean.
- Sisa 9 errors ini semuanya berasal dari **Phase 1** changes yang diinisialisasikan sebelumnya.
- Setelah diperbaiki, `npm run type-check` akan **pass 100%**.
