// =====================================================
// School Repository
// =====================================================

import { Knex } from 'knex'
import { School, CreateSchoolInput, UpdateSchoolInput, EducationLevel } from '../models/interfaces/SchoolInterfaces'

export class SchoolRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    search?: string
    status?: string
    education_level?: EducationLevel
    limit: number
    offset: number
    ids?: number[]
  }): Promise<School[]> {
    const q = this.knex('schools').select('*')
    if (filter.ids) {
      q.whereIn('id', filter.ids)
    }
    if (filter.search) {
      q.where((qb) => {
        qb.whereLike('name', `%${filter.search}%`)
          .orWhereLike('code', `%${filter.search}%`)
          .orWhereLike('city', `%${filter.search}%`)
      })
    }
    if (filter.status) q.where({ status: filter.status })
    if (filter.education_level) q.where({ education_level: filter.education_level })
    q.orderBy('id', 'desc').limit(filter.limit).offset(filter.offset)
    return q
  }

  async count(filter: {
    search?: string
    status?: string
    education_level?: EducationLevel
    ids?: number[]
  }): Promise<number> {
    const q = this.knex('schools').count<{ count: string }[]>('* as count').first()
    if (filter.ids) {
      q.whereIn('id', filter.ids)
    }
    if (filter.search) {
      q.where((qb: any) => {
        qb.whereLike('name', `%${filter.search}%`)
          .orWhereLike('code', `%${filter.search}%`)
          .orWhereLike('city', `%${filter.search}%`)
      })
    }
    if (filter.status) q.where({ status: filter.status })
    if (filter.education_level) q.where({ education_level: filter.education_level })
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<School | null> {
    const row = await this.knex('schools').where({ id }).first()
    return row ?? null
  }

  async findByCode(code: string): Promise<School | null> {
    const row = await this.knex('schools').where({ code }).first()
    return row ?? null
  }

  async create(data: CreateSchoolInput): Promise<School> {
    const now = new Date()
    const [id] = await this.knex('schools').insert({
      ...data,
      status: 'active',
      education_level: data.education_level ?? '3B',
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) throw new Error('Failed to retrieve created school')
    return created
  }

  async update(id: number, data: UpdateSchoolInput): Promise<School | null> {
    await this.knex('schools')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('schools').where({ id }).del()
    return deleted > 0
  }

  async hasDependents(id: number): Promise<boolean> {
    const counts = await Promise.all([
      this.knex('students').where({ school_id: id }).count<{ c: string }[]>('* as c').first(),
      this.knex('teachers').where({ school_id: id }).count<{ c: string }[]>('* as c').first(),
      this.knex('classes').where({ school_id: id }).count<{ c: string }[]>('* as c').first(),
    ])
    return counts.some((c) => Number((c as any)?.c ?? 0) > 0)
  }
}