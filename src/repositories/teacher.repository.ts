// =====================================================
// Teacher Repository
// =====================================================

import { Knex } from 'knex'
import { Teacher, TeacherWithUser, CreateTeacherInput, UpdateTeacherInput } from '../models/interfaces/TeacherInterfaces'

export class TeacherRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    school_id?: number
    search?: string
    limit: number
    offset: number
  }): Promise<TeacherWithUser[]> {
    const q = this.knex('teachers').join('users', 'teachers.user_id', 'users.id').select(
      'teachers.*',
      'users.name',
      'users.email'
    )
    if (filter.school_id) q.where('teachers.school_id', filter.school_id)
    if (filter.search) {
      q.where((qb) => {
        qb.whereLike('users.name', `%${filter.search}%`)
          .orWhereLike('teachers.nip', `%${filter.search}%`)
          .orWhereLike('teachers.specialization', `%${filter.search}%`)
      })
    }
    return q.orderBy('teachers.id', 'desc').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: { school_id?: number; search?: string }): Promise<number> {
    const q = this.knex('teachers')
      .join('users', 'teachers.user_id', 'users.id')
      .count<{ count: string }[]>('teachers.id as count')
      .first()
    if (filter.school_id) q.where('teachers.school_id', filter.school_id)
    if (filter.search) {
      q.where((qb: any) => {
        qb.whereLike('users.name', `%${filter.search}%`)
          .orWhereLike('teachers.nip', `%${filter.search}%`)
          .orWhereLike('teachers.specialization', `%${filter.search}%`)
      })
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<TeacherWithUser | null> {
    const row = await this.knex('teachers')
      .join('users', 'teachers.user_id', 'users.id')
      .select('teachers.*', 'users.name', 'users.email')
      .where('teachers.id', id)
      .first()
    return row ?? null
  }

  async findByIdScoped(id: number, schoolId: number): Promise<TeacherWithUser | null> {
    const row = await this.knex('teachers')
      .join('users', 'teachers.user_id', 'users.id')
      .select('teachers.*', 'users.name', 'users.email')
      .where('teachers.id', id)
      .andWhere('teachers.school_id', schoolId)
      .first()
    return row ?? null
  }

  async findByNip(nip: string): Promise<Teacher | null> {
    const row = await this.knex('teachers').where({ nip }).first()
    return row ?? null
  }

  async create(data: CreateTeacherInput): Promise<Teacher> {
    const now = new Date()
    const [id] = await this.knex('teachers').insert({
      nip: data.nip ?? null,
      user_id: data.user_id,
      school_id: data.school_id,
      specialization: data.specialization ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) throw new Error('Failed to retrieve created teacher')
    return created as Teacher
  }

  async update(id: number, data: UpdateTeacherInput): Promise<Teacher | null> {
    await this.knex('teachers').where({ id }).update({ ...data, updated_at: new Date() })
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('teachers').where({ id }).del()
    return deleted > 0
  }
}