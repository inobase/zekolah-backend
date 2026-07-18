// =====================================================
// Program Repository
// CRUD for programs and specializations
// =====================================================

import { Knex } from 'knex'
import {
  Program,
  ProgramCreateInput,
  ProgramUpdateInput,
  ProgramFilterInput,
  Specialization,
  SpecializationCreateInput,
  SpecializationUpdateInput,
  SpecializationFilterInput,
} from '../models/interfaces/ProgramInterfaces'

export class ProgramRepository {
  constructor(private knex: Knex) {}

  // ==================== PROGRAMS ====================

  async findAll(filter: Partial<ProgramFilterInput & { limit?: number; offset?: number }>): Promise<Program[]> {
    const q = this.knex<Program>('programs').select('*')
    if (filter.education_level) q.where('education_level', filter.education_level)
    if (typeof filter.is_active === 'boolean') q.where('is_active', filter.is_active)
    if (filter.search) {
      q.where((builder) => {
        builder.whereLike('name', `%${filter.search}%`).orWhere('code', 'like', `%${filter.search}%`)
      })
    }
    q.orderBy('id', 'desc')
    if (filter.limit) q.limit(filter.limit)
    if (filter.offset) q.offset(filter.offset)
    return q
  }

  async count(filter: Partial<Pick<ProgramFilterInput, 'education_level' | 'is_active' | 'search'>>): Promise<number> {
    const q = this.knex('programs').count<{ count: string }[]>('* as count').first()
    if (filter.education_level) q.where('education_level', filter.education_level)
    if (typeof filter.is_active === 'boolean') q.where('is_active', filter.is_active)
    if (filter.search) {
      q.where((builder) => {
        builder.whereLike('name', `%${filter.search}%`).orWhere('code', 'like', `%${filter.search}%`)
      })
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<Program | null> {
    return (await this.knex<Program>('programs').where({ id }).first()) ?? null
  }

  async findByCode(code: string): Promise<Program | null> {
    return (await this.knex<Program>('programs').where({ code }).first()) ?? null
  }

  async create(data: ProgramCreateInput): Promise<number> {
    const [id] = await this.knex('programs').insert(data)
    return id as number
  }

  async update(id: number, data: Partial<ProgramUpdateInput>): Promise<void> {
    await this.knex('programs').where({ id }).update(data)
  }

  async deactivate(id: number): Promise<void> {
    await this.knex('programs').where({ id }).update({ is_active: false })
  }

  // ==================== SPECIALIZATIONS ====================

  async specializationFindAll(filter: Partial<SpecializationFilterInput & { limit?: number; offset?: number }>): Promise<Specialization[]> {
    const q = this.knex<Specialization>('specializations').select('*')
    if (filter.program_id) q.where('program_id', filter.program_id)
    if (typeof filter.is_active === 'boolean') q.where('is_active', filter.is_active)
    if (filter.search) {
      q.where((builder) => {
        builder.whereLike('name', `%${filter.search}%`).orWhere('code', 'like', `%${filter.search}%`)
      })
    }
    q.orderBy('id', 'desc')
    if (filter.limit) q.limit(filter.limit)
    if (filter.offset) q.offset(filter.offset)
    return q
  }

  async specializationCount(filter: Partial<Pick<SpecializationFilterInput, 'program_id' | 'is_active' | 'search'>>): Promise<number> {
    const q = this.knex('specializations').count<{ count: string }[]>('* as count').first()
    if (filter.program_id) q.where('program_id', filter.program_id)
    if (typeof filter.is_active === 'boolean') q.where('is_active', filter.is_active)
    if (filter.search) {
      q.where((builder) => {
        builder.whereLike('name', `%${filter.search}%`).orWhere('code', 'like', `%${filter.search}%`)
      })
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async specializationFindById(id: number): Promise<Specialization | null> {
    return (await this.knex<Specialization>('specializations').where({ id }).first()) ?? null
  }

  async specializationFindByProgram(programId: number): Promise<Specialization[]> {
    return this.knex<Specialization>('specializations')
      .where({ program_id: programId, is_active: true })
      .orderBy('id', 'asc')
  }

  async specializationCreate(data: SpecializationCreateInput): Promise<number> {
    const [id] = await this.knex('specializations').insert(data)
    return id as number
  }

  async specializationUpdate(id: number, data: Partial<SpecializationUpdateInput>): Promise<void> {
    await this.knex('specializations').where({ id }).update(data)
  }

  async specializationDeactivate(id: number): Promise<void> {
    await this.knex('specializations').where({ id }).update({ is_active: false })
  }
}
