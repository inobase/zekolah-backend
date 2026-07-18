// =====================================================
// Student Repository
// =====================================================

import { Knex } from 'knex'
import {
  Student,
  StudentWithUser,
  CreateStudentInput,
  UpdateStudentInput,
} from '../models/interfaces/StudentInterfaces'

export class StudentRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    school_id?: number
    class_id?: number
    search?: string
    limit: number
    offset: number
  }): Promise<StudentWithUser[]> {
    const q = this.knex('students').join('users', 'students.user_id', 'users.id').select(
      'students.*',
      'users.name',
      'users.email'
    )
    if (filter.school_id) q.where('students.school_id', filter.school_id)
    if (filter.class_id) q.where('students.class_id', filter.class_id)
    if (filter.search) {
      q.where((qb) => {
        qb.whereLike('users.name', `%${filter.search}%`)
          .orWhereLike('students.nis', `%${filter.search}%`)
          .orWhereLike('students.nisn', `%${filter.search}%`)
      })
    }
    return q.orderBy('students.id', 'desc').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: { school_id?: number; class_id?: number; search?: string }): Promise<number> {
    const q = this.knex('students').count<{ count: string }[]>('* as count').first()
    if (filter.school_id) q.where('students.school_id', filter.school_id)
    if (filter.class_id) q.where('students.class_id', filter.class_id)
    if (filter.search) {
      q.where((qb: any) => {
        qb.whereLike('students.nis', `%${filter.search}%`)
      })
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<StudentWithUser | null> {
    const row = await this.knex('students')
      .join('users', 'students.user_id', 'users.id')
      .select('students.*', 'users.name', 'users.email')
      .where('students.id', id)
      .first()
    return row ?? null
  }

  async findByIdScoped(id: number, schoolId: number): Promise<StudentWithUser | null> {
    const row = await this.knex('students')
      .join('users', 'students.user_id', 'users.id')
      .select('students.*', 'users.name', 'users.email')
      .where('students.id', id)
      .andWhere('students.school_id', schoolId)
      .first()
    return row ?? null
  }

  async findByNis(nis: string): Promise<Student | null> {
    const row = await this.knex('students').where({ nis }).first()
    return row ?? null
  }

  async create(data: CreateStudentInput): Promise<Student> {
    const now = new Date()
    const [id] = await this.knex('students').insert({
      nis: data.nis,
      nisn: data.nisn ?? null,
      user_id: data.user_id,
      class_id: data.class_id ?? null,
      school_id: data.school_id,
      address: data.address ?? null,
      phone: data.phone ?? null,
      date_of_birth: data.date_of_birth ?? null,
      gender: data.gender ?? null,
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) throw new Error('Failed to retrieve created student')
    return created as Student
  }

  async update(id: number, data: UpdateStudentInput): Promise<Student | null> {
    await this.knex('students').where({ id }).update({ ...data, updated_at: new Date() })
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('students').where({ id }).del()
    return deleted > 0
  }

  async hasDependents(id: number): Promise<boolean> {
    const [attendance, submissions, grades] = await Promise.all([
      this.knex('attendance').where({ student_id: id }).count<{ count: string }[]>('* as count').first(),
      this.knex('submissions').where({ student_id: id }).count<{ count: string }[]>('* as count').first(),
      this.knex('grades').where({ student_id: id }).count<{ count: string }[]>('* as count').first(),
    ])
    return [attendance, submissions, grades].some((c) => Number((c as any)?.count ?? 0) > 0)
  }
}