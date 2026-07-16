// =====================================================
// Attendance Service
// =====================================================

import { Knex } from 'knex'
import { AttendanceRepository } from '../repositories/attendance.repository'
import { StudentRepository } from '../repositories/student.repository'
import { SubjectRepository } from '../repositories/subject.repository'
import { Attendance, UpdateAttendanceInput } from '../models/interfaces/AttendanceInterfaces'
import { CreateAttendanceInput, AttendanceFilterInput } from '../validators/attendance.validator'
import { AppError } from '../utils/AppError'

export class AttendanceService {
  private repo: AttendanceRepository
  private studentRepo: StudentRepository
  private subjectRepo: SubjectRepository

  constructor(private knex: Knex) {
    this.repo = new AttendanceRepository(knex)
    this.studentRepo = new StudentRepository(knex)
    this.subjectRepo = new SubjectRepository(knex)
  }

  async list(filter: AttendanceFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, student_id, subject_id, date_from, date_to } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ student_id, subject_id, date_from, date_to, limit, offset }),
      this.repo.count({ student_id, subject_id, date_from, date_to }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Attendance> {
    const attendance = await this.repo.findById(id)
    if (!attendance) throw new AppError('NOT_FOUND', 'Attendance record not found')
    return attendance as Attendance
  }

  async create(data: CreateAttendanceInput): Promise<Attendance> {
    // Validate student exists
    const student = await this.studentRepo.findById(data.student_id)
    if (!student) throw new AppError('NOT_FOUND', 'Student not found')

    // Validate subject exists
    const subject = await this.subjectRepo.findById(data.subject_id)
    if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')

    const id = await this.repo.create(data)
    const result = await this.repo.findById(id)
    return result as Attendance
  }

  async update(id: number, data: UpdateAttendanceInput): Promise<Attendance> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Attendance record not found')

    const updates: Partial<Record<keyof UpdateAttendanceInput, any>> = {}
    for (const key of ['student_id', 'subject_id', 'date', 'status'] as const) {
      if (data[key] !== undefined) updates[key] = data[key]
    }

    if (updates.student_id) {
      const student = await this.studentRepo.findById(updates.student_id)
      if (!student) throw new AppError('NOT_FOUND', 'Student not found')
    }
    if (updates.subject_id) {
      const subject = await this.subjectRepo.findById(updates.subject_id)
      if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')
    }

    const updated = await this.repo.update(id, updates as {})
    if (!updated) throw new AppError('NOT_FOUND', 'Attendance record not found')

    const result = await this.repo.findById(id)
    return result as Attendance
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Attendance record not found')
    const deleted = await this.repo.delete(id)
    if (!deleted) throw new AppError('NOT_FOUND', 'Attendance record not found')
  }
}
