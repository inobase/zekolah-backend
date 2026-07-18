// =====================================================
// Attendance Repository
// =====================================================

import { Knex } from 'knex'
import { Attendance, AttendanceWithDetails } from '../models/interfaces/AttendanceInterfaces'

export class AttendanceRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    student_id?: number
    subject_id?: number
    date_from?: string
    date_to?: string
    school_id?: number
    limit: number
    offset: number
  }): Promise<AttendanceWithDetails[]> {
    let query = this.knex('attendance')
      .join('students', 'attendance.student_id', 'students.id')
      .join('subjects', 'attendance.subject_id', 'subjects.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'attendance.*',
        'students.nis',
        'students.nisn',
        'users.name as student_name',
        'subjects.name as subject_name',
        'subjects.code as subject_code'
      )
      .orderBy('attendance.date', 'desc')

    if (filter.school_id !== undefined && filter.school_id !== null) {
      query = query.where('students.school_id', filter.school_id)
    }
    if (filter.student_id) query = query.where('attendance.student_id', filter.student_id)
    if (filter.subject_id) query = query.where('attendance.subject_id', filter.subject_id)
    if (filter.date_from) query = query.where('attendance.date', '>=', filter.date_from)
    if (filter.date_to) query = query.where('attendance.date', '<=', filter.date_to)

    return query.limit(filter.limit).offset(filter.offset)
  }

  async count(filter: {
    student_id?: number
    subject_id?: number
    date_from?: string
    date_to?: string
    school_id?: number
  }): Promise<number> {
    let query = this.knex('attendance')
      .join('students', 'attendance.student_id', 'students.id')
    if (filter.school_id !== undefined && filter.school_id !== null) {
      query = query.where('students.school_id', filter.school_id)
    }
    if (filter.student_id) query = query.where('attendance.student_id', filter.student_id)
    if (filter.subject_id) query = query.where('attendance.subject_id', filter.subject_id)
    if (filter.date_from) query = query.where('attendance.date', '>=', filter.date_from)
    if (filter.date_to) query = query.where('attendance.date', '<=', filter.date_to)
    const result = await query.count({ count: '*' }).first() as { count: number }
    return result?.count ?? 0
  }

  async findById(id: number): Promise<AttendanceWithDetails | null> {
    const [row] = await this.knex('attendance')
      .join('students', 'attendance.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .select('attendance.*', 'students.nis', 'users.name as student_name')
      .where('attendance.id', id)
    return row || null
  }

  async findByIdScoped(id: number, schoolId: number): Promise<AttendanceWithDetails | null> {
    const [row] = await this.knex('attendance')
      .join('students', 'attendance.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .select('attendance.*', 'students.nis', 'users.name as student_name')
      .where('attendance.id', id)
      .andWhere('students.school_id', schoolId)
    return row || null
  }

  async create(data: { student_id: number; subject_id: number; date: string; status: string }): Promise<number> {
    const now = new Date()
    const [id] = await this.knex('attendance').insert({ ...data, created_at: now, updated_at: now })
    return id
  }

  async update(id: number, data: Partial<{ student_id: number; subject_id: number; date: string; status: string }>): Promise<boolean> {
    const affected = await this.knex('attendance').where({ id }).update({ ...data, updated_at: new Date() })
    return affected > 0
  }

  async delete(id: number): Promise<boolean> {
    const affected = await this.knex('attendance').where({ id }).del()
    return affected > 0
  }
}
