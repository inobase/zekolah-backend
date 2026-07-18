// =====================================================
// School Subject Repository
// CRUD for school-level subjects
// =====================================================

import { Knex } from 'knex'
import {
  SchoolSubject,
  SchoolSubjectCreateInput,
  SchoolSubjectUpdateInput,
  SchoolSubjectFilterInput,
  SubjectType,
} from '../models/interfaces/SchoolSubjectInterfaces'

export class SchoolSubjectRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: Partial<SchoolSubjectFilterInput & { limit?: number; offset?: number }>): Promise<SchoolSubject[]> {
    const q = this.knex<SchoolSubject>('school_subjects').select('*')
    if (filter.school_id) q.where('school_id', filter.school_id)
    if (filter.specialization_id) q.where('specialization_id', filter.specialization_id)
    if (filter.subject_type) q.where('subject_type', filter.subject_type)
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

  async count(filter: Partial<Pick<SchoolSubjectFilterInput, 'school_id' | 'specialization_id' | 'subject_type' | 'search'>>): Promise<number> {
    const q = this.knex('school_subjects').count<{ count: string }[]>('* as count').first()
    if (filter.school_id) q.where('school_id', filter.school_id)
    if (filter.specialization_id) q.where('specialization_id', filter.specialization_id)
    if (filter.subject_type) q.where('subject_type', filter.subject_type)
    if (filter.search) {
      q.where((builder) => {
        builder.whereLike('name', `%${filter.search}%`).orWhere('code', 'like', `%${filter.search}%`)
      })
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<SchoolSubject | null> {
    return (await this.knex<SchoolSubject>('school_subjects').where({ id }).first()) ?? null
  }

  async findByIdWithSpecialization(id: number): Promise<(SchoolSubject & { specialization?: any }) | null> {
    return await this.knex<SchoolSubject>('school_subjects')
      .leftJoin('specializations', 'school_subjects.specialization_id', '=', 'specializations.id')
      .where('school_subjects.id', id)
      .select('school_subjects.*', 'specializations.name as specialization_name', 'specializations.code as specialization_code')
      .first()
  }

  async create(data: SchoolSubjectCreateInput): Promise<number> {
    const [id] = await this.knex('school_subjects').insert(data)
    return id as number
  }

  async update(id: number, data: Partial<SchoolSubjectUpdateInput>): Promise<void> {
    await this.knex('school_subjects').where({ id }).update(data)
  }

  async delete(id: number, schoolId: number): Promise<void> {
    await this.knex('school_subjects').where({ id, school_id: schoolId }).del()
  }

  // Bulk import from specialization data
  async createBatch(subjects: SchoolSubjectCreateInput[]): Promise<void> {
    await this.knex('school_subjects').insert(subjects)
  }

  // Get all school subjects for a school and specialization
  async findBySpecialization(schoolId: number, specializationId: number): Promise<SchoolSubject[]> {
    return this.knex<SchoolSubject>('school_subjects')
      .where({ school_id: schoolId, specialization_id: specializationId })
      .orderBy('id', 'asc')
  }
}
