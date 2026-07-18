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
    school_id?: number
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

    if (filter.school_id !== undefined && filter.school_id !== null) {
      query = query.where('classes.school_id', filter.school_id)
    }
    if (filter.class_id) query = query.where('assignments.class_id', filter.class_id)
    if (filter.subject_id) query = query.where('assignments.subject_id', filter.subject_id)
    if (filter.teacher_id) query = query.where('assignments.teacher_id', filter.teacher_id)

    const rows = await query.orderBy('assignments.due_date', 'asc').limit(filter.limit).offset(filter.offset)
    return rows.map((r: any) => ({ ...r, max_score: Number(r.max_score) })) as AssignmentWithDetails[]
  }

  async count(filter: {
    class_id?: number
    subject_id?: number
    teacher_id?: number
    school_id?: number
  }): Promise<number> {
    let query = this.knex('assignments')
    if (filter.school_id !== undefined && filter.school_id !== null) {
      query = query.join('classes', 'assignments.class_id', 'classes.id').where('classes.school_id', filter.school_id)
      if (filter.class_id) query = query.where('assignments.class_id', filter.class_id)
    } else {
      if (filter.class_id) query = query.where('assignments.class_id', filter.class_id)
    }
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
    if (!row) return null
    return { ...row, max_score: Number(row.max_score) } as unknown as AssignmentWithDetails
  }

  async findByIdScoped(id: number, schoolId: number): Promise<AssignmentWithDetails | null> {
    const [row] = await this.knex('assignments')
      .join('subjects', 'assignments.subject_id', 'subjects.id')
      .join('classes', 'assignments.class_id', 'classes.id')
      .join('teachers', 'assignments.teacher_id', 'teachers.id')
      .join('users', 'teachers.user_id', 'users.id')
      .where('assignments.id', id)
      .andWhere('classes.school_id', schoolId)
      .select(
        'assignments.*',
        'subjects.name as subject_name',
        'classes.name as class_name',
        'classes.school_id as class_school_id',
        'users.name as teacher_name'
      )
    if (!row) return null
    return { ...row, max_score: Number(row.max_score) } as unknown as AssignmentWithDetails
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
