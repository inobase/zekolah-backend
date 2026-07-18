// =====================================================
// Submission Service
// =====================================================

import { Knex } from 'knex'
import { SubmissionRepository } from '../repositories/submission.repository'
import { AssignmentRepository } from '../repositories/assignment.repository'
import { StudentRepository } from '../repositories/student.repository'
import { Submission, UpdateSubmissionInput } from '../models/interfaces/SubmissionInterfaces'
import { CreateSubmissionInput, SubmissionFilterInput } from '../validators/submission.validator'
import { AppError } from '../utils/AppError'

export class SubmissionService {
  private repo: SubmissionRepository
  private assignmentRepo: AssignmentRepository
  private studentRepo: StudentRepository

  constructor(private knex: Knex) {
    this.repo = new SubmissionRepository(knex)
    this.assignmentRepo = new AssignmentRepository(knex)
    this.studentRepo = new StudentRepository(knex)
  }

  async list(filter: SubmissionFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, assignment_id, student_id, school_id } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ assignment_id, student_id, school_id, limit, offset }),
      this.repo.count({ assignment_id, student_id, school_id }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Submission> {
    const submission = await this.repo.findById(id)
    if (!submission) throw new AppError('NOT_FOUND', 'Submission not found')
    return submission as Submission
  }

  async create(data: CreateSubmissionInput): Promise<Submission> {
    // Validate assignment exists
    const assignment = await this.assignmentRepo.findById(data.assignment_id)
    if (!assignment) throw new AppError('NOT_FOUND', 'Assignment not found')

    // Validate student exists
    const student = await this.studentRepo.findById(data.student_id)
    if (!student) throw new AppError('NOT_FOUND', 'Student not found')

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    const { status, ...rest } = data
    const submissionData = {
      ...rest,
      submitted_at: now,
      status: status || 'submitted',
    }

    const id = await this.repo.create(submissionData)
    const result = await this.repo.findById(id)
    return result as Submission
  }

  async update(id: number, data: UpdateSubmissionInput): Promise<Submission> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Submission not found')

    const updates = { ...data } as Partial<Submission>

    // Auto-set graded_at when score is provided
    if (data.score !== undefined) {
      updates.graded_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
      updates.status = 'graded'
    }

    const updated = await this.repo.update(id, updates)
    if (!updated) throw new AppError('NOT_FOUND', 'Submission not found')

    const result = await this.repo.findById(id)
    return result as Submission
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Submission not found')
    const deleted = await this.repo.delete(id)
    if (!deleted) throw new AppError('NOT_FOUND', 'Submission not found')
  }
}