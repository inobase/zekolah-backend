# Integrasi `fastify-swagger` + `fastify-swagger-ui` + `fastify-type-provider-zod` — Diskusi

**Tanggal:** 2026-07-16  
**Status:** Draft / Diskusi Awal

---

## 1. Latar Belakang

### Kenapa Diskusi Ini
Dari observasi di [docs/observations/mvc-readiness.md](docs/observations/mvc-readiness.md#L184):

> **Belum ada Swagger/OpenAPI** → Akan mengganggu validator→dokumentasi  
> **Saran:** Bisa pakai `fastify-type-provider-zod`

Dan di [docs/changes/1_0_2.md](docs/changes/1_0_2.md#L192):

> Belum ada API documentation — Belum ada Swagger/OpenAPI setup

Artinya: sampai versi `1.0.4`, project masih **belum punya auto-generated API docs**, walaupun sudah menggunakan **Zod validators** di banyak endpoint.

### Situasi Validasi Saat Ini
Saat ini, pattern validasi Zod dilakukan secara manual di setiap route:

```ts
// src/routes/auth.routes.ts
app.post(
  '/register',
  { preValidation: async (req) => { req.body = RegisterSchema.parse(req.body) } },
  controller.register
)
```

```ts
// src/controllers/auth.controller.ts
register = async (req: FastifyRequest, reply: FastifyReply): Promise<unknown> => {
  const data = req.body as RegisterInput  // ← cast manual, tidak ada type safety
  // ...
}
```

**Masalah yang muncul:**
1. **Type drift** — `RegisterInput` di-cast manual via `as`, padahal Fastify tidak tahu `req.body` tipenya apa
2. **No documentation** — Zod schema tidak masuk ke OpenAPI spec, sehingga tidak ada Swagger UI
3. **Boilerplate** — `preValidation` callback ditulis di setiap route (14+ routes)
4. **Duplikasi** — Schema ditulis sekali di validator, lalu di-cast manual lagi di controller

---

## 2. Stack yang Diusulkan

| Plugin | Tujuan |
|--------|--------|
| `@fastify/swagger` | Generate OpenAPI 3.x spec otomatis dari route metadata |
| `@fastify/swagger-ui` | Serve interactive Swagger UI di `/docs` |
| `fastify-type-provider-zod` | Bridge antara Zod schema ↔ Fastify type system ↔ OpenAPI |

### Bonus (Opsional)
| Plugin | Tujuan |
|--------|--------|
| `fastify-zod-schema` (alt) | Bisa dipakai kalau ada masalah dengan `fastify-type-provider-zod` |

---

## 3. Cara Kerja Integrasi

### 3.1 Setup Plugin di `app.ts`

```ts
// Tambahkan import
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { validatorCompiler, serializerCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';

// Di dalam buildApp()
await app.register(swagger, {
  openapi: {
    info: {
      title: 'Zekolah Backend API',
      description: 'Educational Management System API documentation',
      version: '1.0.5',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'users', description: 'User management' },
      // ... per fitur
    ],
  },
  transform: jsonSchemaTransform,
  // Expose raw JSON schema
  exposeRoute: true,
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// Compiler setup
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
```

### 3.2 Refactor Route dengan Type Provider

**Sebelum** (manual):
```ts
export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/register',
    {
      preValidation: async (req) => { req.body = RegisterSchema.parse(req.body) },
    },
    controller.register
  );
};
```

**Sesudah** (type-safe):
```ts
export const authRoutes = async (
  app: FastifyZodInstance
): Promise<void> => {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        body: RegisterSchema,
        response: {
          201: RegisterResponseSchema,
        },
      },
    },
    controller.register
  );
};
```

### 3.3 Controller dengan Type Safety

```ts
// Custom type helper di shared/types.ts
type AuthRoutes = FastifyInstance & { withTypeProvider: () => FastifyInstance };
// atau
import { FastifyZodInstance } from '../types/fastify-zod';

export const authRoutes = async (
  app: FastifyZodInstance
): Promise<void> => { /* ... */ }
```

Di controller:
```ts
register = async (
  req: FastifyRequest<{ Body: RegisterInput }>,
  reply: FastifyReply
): Promise<unknown> => {
  const data = req.body  // ← sudah typed sebagai RegisterInput!
  // ...
}
```

---

## 4. Kompatibilitas dengan Fastify v5

Penting untuk dicatat:
- `fastify-type-provider-zod` versi terbaru (`>= 4.x`) support **Fastify v5** + **Zod v3/v4**
- `fastify-swagger` v9+ support Fastify v5
- Project ini pakai `fastify@^5.0.0` dan `zod@^3.24.0` — kompatibel

**Checklist sebelum install:**
- [ ] `fastify@^5.0.0` ✓ (ada)
- [ ] `zod@^3.24.0` ✓ (ada)
- [ ] Node.js >= 20 (asumsi sudah)

---

## 5. Keuntungan Integrasi

| Keuntungan | Detail |
|------------|--------|
| **Type safety end-to-end** | `req.body`, `req.params`, `req.query` otomatis typed dari Zod schema |
| **Single source of truth** | Schema ditulis sekali, dipake untuk validasi + dokumentasi + type |
| **Auto-generated OpenAPI** | Swagger UI di `/docs` langsung hidup tanpa nulis YAML manual |
| **FE integration** | Tim FE bisa generate client types dari OpenAPI spec |
| **Error response standar** | Bisa define error schema sekali, dipakai semua endpoint |
| **IDE autocomplete** | Setelah type provider, autocomplete body/response di controller |

---

## 6. Trade-offs & Risiko

### 6.1 Refactor Cukup Besar
- 14 routes file perlu update dari `FastifyInstance` ke `FastifyZodInstance`
- 13 controllers perlu update signature `req: FastifyRequest<{ Body: T }>`
- 13 validator files perlu export response schema juga (saat ini hanya body schema)

### 6.2 Naming Convention
Response schema perlu dibuat terpisah dari input schema. Pattern:

```ts
// validators/auth.validator.ts
export const RegisterSchema = z.object({ /* input */ });
export const RegisterResponseSchema = z.object({ /* output */ });
// atau
export const UserResponseSchema = z.object({ /* entity */ });
```

### 6.3 Compiler Overhead
`fastify-type-provider-zod` menambahkan 2 compiler yang jalan di setiap request. Overhead kecil (~0.1ms per route), tapi perlu diukur.

### 6.4 Dokumentasi Zod Error
Zod `safeParse` error response perlu di-mapping ke format standar. Default behavior:
```json
{
  "error": "Bad Request",
  "message": "Validation failed",
  "issues": [
    { "path": ["email"], "message": "Invalid email" }
  ]
}
```

Saat ini `errorHandler` belum tentu handle ini. Perlu dicek.

---

## 7. Migrasi Bertahap (Rekomendasi)

### Phase 1 — Foundation
1. Install 3 plugin + update `package.json`
2. Setup plugin di `app.ts` (compiler + swagger + swagger-ui)
3. Tambah route `app.get('/docs', ...)` dan `app.get('/json', ...)` (auto)
4. **Verifikasi**: `/docs` muncul dengan empty spec
5. Tambah security scheme `bearerAuth`

### Phase 2 — Pilot (2-3 endpoint)
1. Pilih 1 fitur paling simpel (misal: `auth`)
2. Refactor `auth.routes.ts` pakai `withTypeProvider`
3. Tambah response schema di `auth.validator.ts`
4. Update `auth.controller.ts` signature
5. Run tests — pastikan semua test pass
6. **Verifikasi**: `/docs` menampilkan endpoint auth dengan body/response schema lengkap

### Phase 3 — Full Rollout
1. Apply pattern Phase 2 ke 13 fitur lain (school, user, student, teacher, class, subject, dll)
2. Tambahkan tags grouping per fitur
3. Tambahkan response schema standar (200, 201, 400, 401, 403, 404, 500)
4. Dokumentasikan header khusus (`X-School-ID`, `X-Academic-Year-ID`) di OpenAPI

### Phase 4 — Polish (Opsional)
1. Tambah request/response examples
2. Tambah description per endpoint
3. Custom CSS untuk Swagger UI (optional)
4. Setup CI untuk validasi spec (opsional)

---

## 8. Estimasi Effort

| Phase | Task | Estimasi |
|-------|------|----------|
| Phase 1 | Install + setup plugin | 30 min |
| Phase 2 | Pilot auth routes | 1-2 jam |
| Phase 3 | Full rollout (13 fitur) | 4-6 jam |
| Phase 4 | Polish + examples | 2-3 jam |
| **Total** | | **~8-11 jam** |

Effort bisa berkurang kalau kita pilih hanya beberapa fitur dulu (misal: auth, school, user) dan sisanya on-demand.

---

## 9. Pertanyaan untuk Diskusi

1. **Cakupan awal**: Refactor semua 13 fitur sekaligus, atau bertahap?
2. **Response schema**: Apakah semua endpoint perlu response schema, atau cukup body + params + query saja?
3. **Standard error response**: Apakah perlu refactor `errorHandler` untuk standarisasi format error?
4. **Security scheme**: Cukup `bearerAuth`, atau perlu OAuth flow juga (jika ada OAuth di roadmap)?
5. **Tags grouping**: Otomatis dari prefix folder, atau manual di tiap route?
6. **CI integration**: Apakah perlu validasi OpenAPI spec di CI (misal: spectral lint)?

---

## 10. Rekomendasi Awal

Mulai dengan **Phase 1 + Phase 2** dulu:
- Setup plugin di `app.ts`
- Pilot di fitur `auth` (4 endpoint, paling simpel)
- Verifikasi Swagger UI jalan dan types benar

Setelah yakin stabil, rollout ke fitur lain. Ini menghindari big-bang refactor yang berisiko break banyak test sekaligus.

---

*Catatan: Dokumen ini adalah draft diskusi. Keputusan akhir akan diupdate di sini sebelum implementasi dimulai.*