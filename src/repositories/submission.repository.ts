// =====================================================
// Submission Repository
// =====================================================

import { Knex } from 'knex'
import { Submission, SubmissionWithDetails } from '../models/interfaces/SubmissionInterfaces'

export class SubmissionRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    assignment_id?: number
    student_id?: number
    limit: number
    offset: number
  }): Promise<SubmissionWithDetails[]> {
    let query = this.knex('submissions')
      .join('assignments', 'submissions.assignment_id', 'assignments.id')
      .join('students', 'submissions.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .select(
        'submissions.*',
        'assignments.title as assignment_title',
        'students.nis',
        'users.name as student_name'
      )

    if (filter.assignment_id) query = query.where('submissions.assignment_id', filter.assignment_id)
    if (filter.student_id) query = query.where('submissions.student_id', filter.student_id)

    const rows = await query.orderBy('submissions.submitted_at', 'desc').limit(filter.limit).offset(filter.offset)
    return rows.map((r: any) => ({
      ...r,
      score: r.score !== null && r.score !== undefined ? Number(r.score) : null,
    })) as SubmissionWithDetails[]
  }

  async count(filter: {
    assignment_id?: number
    student_id?: number
  }): Promise<number> {
    let query = this.knex('submissions')
    if (filter.assignment_id) query = query.where('submissions.assignment_id', filter.assignment_id)
    if (filter.student_id) query = query.where('submissions.student_id', filter.student_id)
    const result = await query.count({ count: '*' }).first() as { count: number }
    return result?.count ?? 0
  }

  async findById(id: number): Promise<SubmissionWithDetails | null> {
    const [row] = await this.knex('submissions')
      .join('assignments', 'submissions.assignment_id', 'assignments.id')
      .join('students', 'submissions.student_id', 'students.id')
      .join('users', 'students.user_id', 'users.id')
      .where('submissions.id', id)
      .select(
        'submissions.*',
        'assignments.title as assignment_title',
        'users.name as student_name',
        'students.nis'
      )
    if (!row) return null
    return {
      ...row,
      score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    } as unknown as SubmissionWithDetails
  }

  async create(data: Partial<Submission>): Promise<number> {
    const now = new Date()
    const [id] = await this.knex('submissions').insert({ ...data, created_at: now, updated_at: now })
    return id
  }

  async update(id: number, data: Partial<Submission>): Promise<boolean> {
    const affected = await this.knex('submissions').where({ id }).update({ ...data, updated_at: new Date() })
    return affected > 0
  }

  async delete(id: number): Promise<boolean> {
    const affected = await this.knex('submissions').where({ id }).del()
    return affected > 0
  }
}