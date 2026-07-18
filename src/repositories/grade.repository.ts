// =====================================================
// Grade Repository
// =====================================================

import { Knex } from 'knex'
import { Grade, GradeWithDetails } from '../models/interfaces/GradeInterfaces'

export class GradeRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    student_id?: number
    subject_id?: number
    assessment_type?: string
    school_id?: number
    limit: number
    offset: number
  }): Promise<GradeWithDetails[]> {
    let query = this.knex('grades')
      .join('students', 'grades.student_id', 'students.id')
      .join('subjects', 'grades.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'grades.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'users.name as student_name',
        'students.nis'
      )

    if (filter.school_id !== undefined && filter.school_id !== null) {
      query = query.where('students.school_id', filter.school_id)
    }
    if (filter.student_id) query = query.where('grades.student_id', filter.student_id)
    if (filter.subject_id) query = query.where('grades.subject_id', filter.subject_id)
    if (filter.assessment_type) query = query.where('grades.assessment_type', filter.assessment_type)

    const rows = await query.limit(filter.limit).offset(filter.offset)
    return rows.map((r: any) => ({ ...r, max_score: Number(r.max_score), score: Number(r.score) })) as GradeWithDetails[]
  }

  async count(filter: {
    student_id?: number
    subject_id?: number
    assessment_type?: string
    school_id?: number
  }): Promise<number> {
    let query = this.knex('grades')
      .join('students', 'grades.student_id', 'students.id')
    if (filter.school_id !== undefined && filter.school_id !== null) {
      query = query.where('students.school_id', filter.school_id)
    }
    if (filter.student_id) query = query.where('grades.student_id', filter.student_id)
    if (filter.subject_id) query = query.where('grades.subject_id', filter.subject_id)
    if (filter.assessment_type) query = query.where('grades.assessment_type', filter.assessment_type)
    const result = await query.count({ count: '*' }).first() as { count: number }
    return result?.count ?? 0
  }

  async findById(id: number): Promise<GradeWithDetails | null> {
    const [row] = await this.knex('grades')
      .join('students', 'grades.student_id', 'students.id')
      .join('subjects', 'grades.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .where('grades.id', id)
      .select(
        'grades.*',
        'subjects.name as subject_name',
        'users.name as student_name',
        'students.nis'
      )
    if (!row) return null
    return { ...row, max_score: Number(row.max_score), score: Number(row.score) } as unknown as GradeWithDetails
  }

  async findByIdScoped(id: number, schoolId: number): Promise<GradeWithDetails | null> {
    const [row] = await this.knex('grades')
      .join('students', 'grades.student_id', 'students.id')
      .join('subjects', 'grades.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .where('grades.id', id)
      .andWhere('students.school_id', schoolId)
      .select(
        'grades.*',
        'subjects.name as subject_name',
        'users.name as student_name',
        'students.nis'
      )
    if (!row) return null
    return { ...row, max_score: Number(row.max_score), score: Number(row.score) } as unknown as GradeWithDetails
  }

  async create(data: Partial<Grade>): Promise<number> {
    const now = new Date()
    const [id] = await this.knex('grades').insert({ ...data, created_at: now, updated_at: now })
    return id
  }

  async update(id: number, data: Partial<Grade>): Promise<boolean> {
    const affected = await this.knex('grades').where({ id }).update({ ...data, updated_at: new Date() })
    return affected > 0
  }

  async delete(id: number): Promise<boolean> {
    const affected = await this.knex('grades').where({ id }).del()
    return affected > 0
  }
}