// =====================================================
// Assignment Repository
// =====================================================

import { Knex } from 'knex'
import { Assignment, AssignmentWithDetails } from '../models/interfaces/AssignmentInterfaces'

export class AssignmentRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    class_id?: number
    subject_id?: number
    teacher_id?: number
    limit: number
    offset: number
  }): Promise<AssignmentWithDetails[]> {
    let query = this.knex('assignments')
      .join('classes', 'assignments.class_id', 'classes.id')
      .join('subjects', 'assignments.subject_id', 'subjects.id')
      .join('teachers', 'assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .select(
        'assignments.*',
        'subjects.name as subject_name',
        'subjects.code as subject_code',
        'classes.name as class_name',
        'users.name as teacher_name'
      )

    if (filter.class_id) query = query.where('assignments.class_id', filter.class_id)
    if (filter.subject_id) query = query.where('assignments.subject_id', filter.subject_id)
    if (filter.teacher_id) query = query.where('assignments.teacher_id', filter.teacher_id)

    return query.orderBy('assignments.due_date', 'asc').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: {
    class_id?: number
    subject_id?: number
    teacher_id?: number
  }): Promise<number> {
    let query = this.knex('assignments')
    if (filter.class_id) query = query.where('assignments.class_id', filter.class_id)
    if (filter.subject_id) query = query.where('assignments.subject_id', filter.subject_id)
    if (filter.teacher_id) query = query.where('assignments.teacher_id', filter.teacher_id)
    const result = await query.count({ count: '*' }).first() as { count: number }
    return result?.count ?? 0
  }

  async findById(id: number): Promise<AssignmentWithDetails | null> {
    const [row] = await this.knex('assignments')
      .join('subjects', 'assignments.subject_id', 'subjects.id')
      .join('classes', 'assignments.class_id', 'classes.id')
      .join('teachers', 'assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .where('assignments.id', id)
      .select(
        'assignments.*',
        'subjects.name as subject_name',
        'classes.name as class_name',
        'users.name as teacher_name'
      )
    return row || null
  }

  async hasDependents(id: number): Promise<boolean> {
    const submission = await this.knex('submissions').where('assignment_id', id).first()
    return !!submission
  }

  async create(data: Partial<Assignment>): Promise<number> {
    const now = new Date()
    const [id] = await this.knex('assignments').insert({ ...data, created_at: now, updated_at: now })
    return id
  }

  async update(id: number, data: Partial<Assignment>): Promise<boolean> {
    const affected = await this.knex('assignments').where({ id }).update({ ...data, updated_at: new Date() })
    return affected > 0
  }

  async delete(id: number): Promise<boolean> {
    const affected = await this.knex('assignments').where({ id }).del()
    return affected > 0
  }
}
