// =====================================================
// Subject Repository
// =====================================================

import { Knex } from 'knex'
import { Subject, CreateSubjectInput, UpdateSubjectInput } from '../models/interfaces/SubjectInterfaces'

export class SubjectRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: { search?: string; limit: number; offset: number; school_id?: number }): Promise<Subject[]> {
    const q = this.knex('subjects').select('*')
    if (filter.school_id !== undefined && filter.school_id !== null) q.where({ school_id: filter.school_id })
    if (filter.search) {
      q.where((qb) => qb.whereLike('name', `%${filter.search}%`).orWhereLike('code', `%${filter.search}%`))
    }
    return q.orderBy('name').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: { search?: string; school_id?: number }): Promise<number> {
    const q = this.knex('subjects').count<{ count: string }[]>('* as count').first()
    if (filter.school_id !== undefined && filter.school_id !== null) q.where({ school_id: filter.school_id })
    if (filter.search) {
      q.where((qb: any) => qb.whereLike('name', `%${filter.search}%`).orWhereLike('code', `%${filter.search}%`))
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<Subject | null> {
    const row = await this.knex('subjects').where({ id }).first()
    return row ?? null
  }

  async findByCode(code: string): Promise<Subject | null> {
    const row = await this.knex('subjects').where({ code }).first()
    return row ?? null
  }

  async create(data: CreateSubjectInput): Promise<Subject> {
    const now = new Date()
    const [id] = await this.knex('subjects').insert({
      name: data.name,
      code: data.code,
      school_id: data.school_id,
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) throw new Error('Failed to retrieve created subject')
    return created
  }

  async update(id: number, data: UpdateSubjectInput): Promise<Subject | null> {
    await this.knex('subjects').where({ id }).update({ ...data, updated_at: new Date() })
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('subjects').where({ id }).del()
    return deleted > 0
  }

  async hasDependents(id: number): Promise<boolean> {
    // Subject is referenced by teaching_assignments and assignments
    const [taCount, assignmentCount] = await Promise.all([
      this.knex('teaching_assignments').where({ subject_id: id }).count('* as c').first(),
      this.knex('assignments').where({ subject_id: id }).count('* as c').first(),
    ])
    return Number((taCount as any)?.c ?? 0) > 0 || Number((assignmentCount as any)?.c ?? 0) > 0
  }
}