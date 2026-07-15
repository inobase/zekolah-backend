# Diskusi: Penerapan Arsitektur MVC di Backend zeKolah

> Tanggal: 2026-07-15
> Status: Draft — menunggu perintah lebih lanjut

---

## Latar Belakang

Project **zeKolah backend** (Fastify + TypeScript + Knex) saat ini masih menggunakan pola **route-centric** di mana:

- Routes langsung berisi logika bisnis, query database, dan validasi Zod
- Knex queries berada di dalam file route
- Tidak ada pemisahan layer (controller/service/repository)
- Migrasi dan seeders masih terpisah

Berdasarkan dokumentasi perubahan `1.0.1.md` dan `1_0_2.md`, kita perlu refaktor arsitektur ke pola **MVC (Model-View-Controller)** yang lebih terstruktur dan maintainable untuk jangka panjang.

---

## Struktur Target

```
src/
├── controllers/     # Handler HTTP (validasi input → panggil service → kirim respons)
├── services/        # Logika bisnis (transaksi, kalkulasi, aturan bisnis)
├── repositories/    # Data access layer (Knex queries, satuan kerja database)
├── models/          # Entitas domain (Interface + Class-based entity)
├── middlewares/     # Auth, error handler, dll.
├── routes/          # HANYA registrasi route + mapping ke controller
├── validators/      # Schema Zod terpisah dari routes
└── utils/           # Logger, helper, dll.
```

---

## Keputusan Arsitektur

### 1. Data Access Layer: Knex Query Builder Pattern di Repository

**Pilihan:** Query Builder Pattern di Repository (+ raw untuk kasus khusus)

**Perbedaan:**

| Aspek | Raw Query | Query Builder Pattern |
|-------|-----------|----------------------|
| Penulisan | SQL string langsung | Method-chain Knex |
| Type safety | Tidak ada | Lebih baik |
| SQL injection | Rentan jika lalai | Aman (auto-parameterized) |
| Testability | Sulit di-mock | Mudah di-mock |
| Query kompleks | Mudah | Perlu `raw()` untuk kasus khusus |

**Implementasi:**

```typescript
// src/repositories/StudentRepository.ts
import { Knex } from 'knex'
import { Student, CreateStudentInput, UpdateStudentInput } from '../models/Student'

export class StudentRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: { schoolId?: string; classId?: string } = {}): Promise<Student[]> {
    const query = this.knex('students').select('*')
    if (filter.schoolId) query.where('school_id', filter.schoolId)
    if (filter.classId) query.where('class_id', filter.classId)
    return query
  }

  async findById(id: string): Promise<Student | null> {
    const result = await this.knex('students').where({ id }).first()
    return result ?? null
  }

  async create(data: CreateStudentInput): Promise<Student> {
    const [inserted] = await this.knex('students').insert(data).returning('*')
    return inserted
  }

  async update(id: string, data: UpdateStudentInput): Promise<Student | null> {
    const [updated] = await this.knex('students')
      .where({ id })
      .update(data)
      .returning('*')
    return updated ?? null
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.knex('students').where({ id }).del()
    return deleted > 0
  }
}
```

**Catatan:** Raw query (`knex.raw()`) boleh dipakai untuk:
- Complex analytics query (CTE, window function)
- Stored procedure call
- Aggregate report

---

### 2. Model Layer: Hybrid Approach (Interface + Class-based Entity)

**Pilihan:** Interface untuk data contract & type hints, Class untuk entity yang punya business logic

**Perbedaan:**

| Aspek | Interface Only | Class-based Entity |
|-------|---------------|-------------------|
| Definisi | Tipe data saja | Data + behavior/method |
| Boilerplate | Minimal | Lebih banyak |
| Business logic | Tidak ada | Embedded di method |
| Encapsulation | Tidak | Ya |
| Validasi | Terpisah | Di constructor/method |

**Implementasi:**

#### Interface (untuk type contract)

```typescript
// src/models/Student.ts
export interface Student {
  id: string
  school_id: string
  class_id: string | null
  student_number: string
  name: string
  birth_date: string
  gender: 'male' | 'female'
  address: string | null
  parent_name: string | null
  parent_phone: string | null
  created_at: Date
  updated_at: Date
}

export interface CreateStudentInput {
  school_id: string
  class_id?: string
  student_number: string
  name: string
  birth_date: string
  gender: 'male' | 'female'
  address?: string
  parent_name?: string
  parent_phone?: string
}

export interface UpdateStudentInput {
  class_id?: string
  student_number?: string
  name?: string
  birth_date?: string
  gender?: 'male' | 'female'
  address?: string
  parent_name?: string
  parent_phone?: string
}
```

#### Class-based Entity (untuk business logic)

```typescript
// src/models/entities/StudentEntity.ts
import { Student } from '../Student'

export class StudentEntity implements Student {
  constructor(
    public readonly id: string,
    public readonly school_id: string,
    public class_id: string | null,
    public student_number: string,
    public name: string,
    public birth_date: string,
    public gender: 'male' | 'female',
    public address: string | null,
    public parent_name: string | null,
    public parent_phone: string | null,
    public readonly created_at: Date,
    public updated_at: Date
  ) {}

  // Business logic methods
  isEnrolled(): boolean {
    return this.class_id !== null
  }

  age(asOf: Date = new Date()): number {
    const birth = new Date(this.birth_date)
    let age = asOf.getFullYear() - birth.getFullYear()
    const monthDiff = asOf.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  assignToClass(classId: string): void {
    if (!classId) throw new Error('Class ID is required')
    this.class_id = classId
  }

  unassignFromClass(): void {
    this.class_id = null
  }

  updateName(newName: string): void {
    const trimmed = newName.trim()
    if (trimmed.length < 2) throw new Error('Name must be at least 2 characters')
    this.name = trimmed
  }

  toJSON(): Student {
    return {
      id: this.id,
      school_id: this.school_id,
      class_id: this.class_id,
      student_number: this.student_number,
      name: this.name,
      birth_date: this.birth_date,
      gender: this.gender,
      address: this.address,
      parent_name: this.parent_name,
      parent_phone: this.parent_phone,
      created_at: this.created_at,
      updated_at: this.updated_at,
    }
  }
}
```

**Panduan Penggunaan:**
- **Interface only:** Untuk entitas sederhana (Subject, Grade, AcademicYear) — tidak ada business logic
- **Interface + Class:** Untuk entitas kompleks (Student, Attendance, Submission, Assignment) — ada validasi, transformasi, atau aturan bisnis

---

### 3. Validation Layer: Zod Schema di Validator (tanpa DTO class)

**Pilihan:** Zod Schema di route validator, tanpa DTO class terpisah

**Perbedaan dengan DTO Pattern:**

| Aspek | Zod Only | DTO Class |
|-------|----------|-----------|
| Definisi | Schema di route | Class terpisah |
| Boilerplate | Minimal | Banyak (constructor, getter) |
| Type inference | `z.infer<typeof schema>` | Manual interface |
| Single source of truth | Ya (schema = type = validator) | Tidak (DTO + Zod duplikat) |
| Versi API | 1 schema per route | Class per versi |
| Cocok untuk | Proyek sederhana-menengah | Proyek besar/enterprise |

**Mengapa tidak pakai DTO class untuk saat ini:**
- 7 modul akademik tidak cukup kompleks untuk butuh versioning
- Validasi + transformasi data bisa ditangani Zod schema
- Lebih sedikit boilerplate
- Type inference otomatis via `z.infer<>()`

**Implementasi:**

```typescript
// src/validators/student.validator.ts
import { z } from 'zod'

export const CreateStudentSchema = z.object({
  school_id: z.string().uuid(),
  class_id: z.string().uuid().optional(),
  student_number: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal: YYYY-MM-DD'),
  gender: z.enum(['male', 'female']),
  address: z.string().max(255).optional(),
  parent_name: z.string().max(100).optional(),
  parent_phone: z.string().max(20).optional(),
})

export const UpdateStudentSchema = CreateStudentSchema.partial().omit({ school_id: true })

export const StudentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  school_id: z.string().uuid().optional(),
  class_id: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
})

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>
export type StudentFilterInput = z.infer<typeof StudentFilterSchema>
```

**Kapan perlu DTO class:**
- Versioning API (v1, v2 dengan struktur berbeda)
- Complex data transformation (misal import CSV → entity)
- Integrasi dengan sistem eksternal yang punya kontrak sendiri
- Saat 1 endpoint perlu normalisasi data dari beberapa sumber

---

## Alur Request (Flow MVC di Fastify)

```
HTTP Request
    ↓
Route (registrasi + validasi)
    ↓ preHandler: validate(Zod schema)
    ↓
Controller (handler tipis: parse request, panggil service)
    ↓
Service (logika bisnis, transaksi, kalkulasi)
    ↓
Repository (Knex query builder)
    ↓
Database
    ↓
Response
```

**Contoh Implementasi Lengkap:**

```typescript
// src/routes/student.routes.ts (TIPIS, hanya registrasi)
import { FastifyPluginAsync } from 'fastify'
import { StudentController } from '../controllers/student.controller'
import { CreateStudentSchema, UpdateStudentSchema, StudentFilterSchema } from '../validators/student.validator'
import { getKnex } from '../config/database'

export const studentRoutes: FastifyPluginAsync = async (app) => {
  const knex = getKnex()
  const controller = new StudentController(knex)

  app.get('/', {
    preHandler: [app.authenticate, async (req) => { req.query = StudentFilterSchema.parse(req.query) }],
  }, controller.list)

  app.get('/:id', {
    preHandler: [app.authenticate],
  }, controller.getById)

  app.post('/', {
    preHandler: [
      app.authenticate,
      async (req) => { req.body = CreateStudentSchema.parse(req.body) },
    ],
  }, controller.create)

  app.patch('/:id', {
    preHandler: [
      app.authenticate,
      async (req) => { req.body = UpdateStudentSchema.parse(req.body) },
    ],
  }, controller.update)

  app.delete('/:id', {
    preHandler: [app.authenticate],
  }, controller.delete)
}
```

```typescript
// src/controllers/student.controller.ts (TIPIS, handler murni)
import { FastifyRequest, FastifyReply } from 'fastify'
import { Knex } from 'knex'
import { StudentService } from '../services/student.service'
import { CreateStudentInput, UpdateStudentInput, StudentFilterInput } from '../validators/student.validator'

export class StudentController {
  private service: StudentService

  constructor(knex: Knex) {
    this.service = new StudentService(knex)
  }

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const filter = req.query as StudentFilterInput
    const result = await this.service.list(filter)
    return reply.send(result)
  }

  getById = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const student = await this.service.getById(id)
    if (!student) return reply.code(404).send({ error: 'Not Found', message: 'Student not found' })
    return reply.send(student)
  }

  create = async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateStudentInput
    const student = await this.service.create(body)
    return reply.code(201).send(student)
  }

  update = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const body = req.body as UpdateStudentInput
    const student = await this.service.update(id, body)
    if (!student) return reply.code(404).send({ error: 'Not Found', message: 'Student not found' })
    return reply.send(student)
  }

  delete = async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string }
    const success = await this.service.delete(id)
    if (!success) return reply.code(404).send({ error: 'Not Found', message: 'Student not found' })
    return reply.code(204).send()
  }
}
```

```typescript
// src/services/student.service.ts (LOGIKA BISNIS)
import { Knex } from 'knex'
import { StudentRepository } from '../repositories/student.repository'
import { CreateStudentInput, UpdateStudentInput, StudentFilterInput } from '../validators/student.validator'

export class StudentService {
  private repo: StudentRepository

  constructor(knex: Knex) {
    this.repo = new StudentRepository(knex)
  }

  async list(filter: StudentFilterInput) {
    const { page, limit, ...rest } = filter
    const offset = (page - 1) * limit
    const [data, [{ total }]] = await Promise.all([
      this.repo.findAll({ ...rest, limit, offset }),
      this.repo.count({ ...rest }),
    ])
    return {
      data,
      pagination: { page, limit, total: Number(total) },
    }
  }

  async getById(id: string) {
    return this.repo.findById(id)
  }

  async create(data: CreateStudentInput) {
    // Business logic: cek duplikat student_number per sekolah
    const existing = await this.repo.findByStudentNumber(data.school_id, data.student_number)
    if (existing) {
      throw new Error('STUDENT_NUMBER_ALREADY_EXISTS')
    }
    return this.repo.create(data)
  }

  async update(id: string, data: UpdateStudentInput) {
    const existing = await this.repo.findById(id)
    if (!existing) return null
    return this.repo.update(id, data)
  }

  async delete(id: string) {
    // Business logic: tidak boleh hapus siswa yang punya submission
    const hasSubmissions = await this.repo.hasSubmissions(id)
    if (hasSubmissions) {
      throw new Error('STUDENT_HAS_SUBMISSIONS')
    }
    return this.repo.delete(id)
  }
}
```

---

## Refactor Plan (Roadmap)

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Buat folder `controllers/`, `services/`, `repositories/`, `validators/`, `models/` | ⏳ |
| 2 | Migrasi modul `auth` (paling sederhana) ke MVC | ⏳ |
| 3 | Migrasi modul `school` | ⏳ |
| 4 | Migrasi modul `student` | ⏳ |
| 5 | Migrasi modul `class` | ⏳ |
| 6 | Migrasi modul `teacher` | ⏳ |
| 7 | Migrasi modul `subject` | ⏳ |
| 8 | Migrasi modul `academic-year` | ⏳ |
| 9 | Migrasi modul `attendance` | ⏳ |
| 10 | Migrasi modul `assignment` + `submission` | ⏳ |
| 11 | Migrasi modul `grade` + `teaching-assignment` | ⏳ |
| 12 | Hapus kode lama di `routes/` | ⏳ |
| 13 | Update dokumentasi `1.0.3.md` | ⏳ |

---

## Catatan & Prinsip

1. **Controllers = TIPIS** — Hanya parse request, panggil service, format response. Tidak ada business logic
2. **Services = LOGIKA BISNIS** — Tempat validasi bisnis, transaksi multi-step, kalkulasi
3. **Repositories = DATA ACCESS** — Hanya berinteraksi dengan database, tidak ada logika bisnis
4. **Models = DATA + CONTRACT** — Interface untuk type, Class untuk entity dengan method
5. **Validators = ZOD SCHEMA** — Validasi input di boundary (route), bukan di service
6. **Routes = DEKLARATIF** — Hanya registrasi path + method + handler + preHandler
7. **Knex Query Builder** sebagai default di repository, raw query hanya untuk kasus khusus
8. **Zod schema** = single source of truth untuk input validation

---

## Status

- [x] Diskusi awal arsitektur
- [x] Keputusan 1: Query Builder Pattern
- [x] Keputusan 2: Hybrid (Interface + Class Entity)
- [x] Keputusan 3: Zod Schema (tanpa DTO class)
- [ ] Mulai implementasi refactor
- [ ] Update changelog `1.0.3.md`
