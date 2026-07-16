// =====================================================
// TeachingAssignment Repository
// =====================================================

import { Knex } from 'knex'
import { TeachingAssignment, TeachingAssignmentWithDetails } from '../models/interfaces/TeachingAssignmentInterfaces'

export class TeachingAssignmentRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    teacher_id?: number
    class_id?: number
    subject_id?: number
    limit: number
    offset: number
  }): Promise<TeachingAssignmentWithDetails[]> {
    let query = this.knex('teaching_assignments')
      .join('teachers', 'teaching_assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .join('classes', 'teaching_assignments.class_id', 'classes.id')
      .join('subjects', 'teaching_assignments.subject_id', 'subjects.id')
      .join('academic_years', 'teaching_assignments.academic_year_id', 'academic_years.id')
      .select(
        'teaching_assignments.*',
        'users.name as teacher_name',
        'teachers.specialization',
        'classes.name as class_name',
        'classes.grade',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'academic_years.year as academic_year_label'
      )

    if (filter.teacher_id) query = query.where('teaching_assignments.teacher_id', filter.teacher_id)
    if (filter.class_id) query = query.where('teaching_assignments.class_id', filter.class_id)
    if (filter.subject_id) query = query.where('teaching_assignments.subject_id', filter.subject_id)

    return query.orderBy('teaching_assignments.id', 'desc').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: {
    teacher_id?: number
    class_id?: number
    subject_id?: number
  }): Promise<number> {
    let query = this.knex('teaching_assignments')
    if (filter.teacher_id) query = query.where('teaching_assignments.teacher_id', filter.teacher_id)
    if (filter.class_id) query = query.where('teaching_assignments.class_id', filter.class_id)
    if (filter.subject_id) query = query.where('teaching_assignments.subject_id', filter.subject_id)
    const result = await query.count({ count: '*' }).first() as { count: number }
    return result?.count ?? 0
  }

  async findById(id: number): Promise<TeachingAssignmentWithDetails | null> {
    const row = await this.knex('teaching_assignments')
      .join('teachers', 'teaching_assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .join('classes', 'teaching_assignments.class_id', 'classes.id')
      .join('subjects', 'teaching_assignments.subject_id', 'subjects.id')
      .join('academic_years', 'teaching_assignments.academic_year_id', 'academic_years.id')
      .select(
        'teaching_assignments.*',
        'users.name as teacher_name',
        'teachers.specialization',
        'classes.name as class_name',
        'classes.grade',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'academic_years.year as academic_year_label'
      )
      .where('teaching_assignments.id', id)
      .first()

    return row || null
  }

  async findByUniqueFields(data: {
    teacher_id: number
    class_id: number
    subject_id: number
    academic_year_id: number
  }): Promise<TeachingAssignment | null> {
    const row = await this.knex('teaching_assignments')
      .where(data)
      .first()
    return row || null
  }

  async create(data: { teacher_id: number; class_id: number; subject_id: number; academic_year_id: number }): Promise<number> {
    const now = new Date()
    const [id] = await this.knex('teaching_assignments').insert({ ...data, created_at: now, updated_at: now })
    return id
  }

  async update(id: number, data: Partial<{ teacher_id: number; class_id: number; subject_id: number; academic_year_id: number }>): Promise<boolean> {
    const affected = await this.knex('teaching_assignments').where({ id }).update({ ...data, updated_at: new Date() })
    return affected > 0
  }

  async delete(id: number): Promise<boolean> {
    const affected = await this.knex('teaching_assignments').where({ id }).del()
    return affected > 0
  }
}
