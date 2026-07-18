// =====================================================
// Student Service
// =====================================================

import { Knex } from 'knex'
import { StudentRepository } from '../repositories/student.repository'
import { UserRepository } from '../repositories/user.repository'
import { SchoolRepository } from '../repositories/school.repository'
import { Student } from '../models/interfaces/StudentInterfaces'
import {
  CreateStudentInput,
  UpdateStudentInput,
  StudentFilterInput,
} from '../validators/student.validator'
import { AppError } from '../utils/AppError'

export class StudentService {
  private repo: StudentRepository
  private userRepo: UserRepository
  private schoolRepo: SchoolRepository

  constructor(private knex: Knex) {
    this.repo = new StudentRepository(knex)
    this.userRepo = new UserRepository(knex)
    this.schoolRepo = new SchoolRepository(knex)
  }

  async list(filter: StudentFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, ...rest } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ ...rest, limit, offset }),
      this.repo.count(rest),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Student> {
    const student = await this.repo.findById(id)
    if (!student) throw new AppError('NOT_FOUND', 'Student not found')
    return student as Student
  }

  async create(data: CreateStudentInput): Promise<Student> {
    // Validate FKs
    const user = await this.userRepo.findById(data.user_id)
    if (!user) throw new AppError('NOT_FOUND', 'User not found')

    const school = await this.schoolRepo.findById(data.school_id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')

    // Validate NIS uniqueness
    const existing = await this.repo.findByNis(data.nis)
    if (existing) throw new AppError('ALREADY_EXISTS', 'Student NIS already exists')

    return this.repo.create(data)
  }

  async update(id: number, data: UpdateStudentInput): Promise<Student> {
    // Verify entity exists (school check done in controller)
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Student not found')
    
    if (data.nis) {
      const existingNis = await this.repo.findByNis(data.nis)
      if (existingNis && existingNis.id !== id) {
        throw new AppError('ALREADY_EXISTS', 'Student NIS already exists')
      }
    }
    const updated = await this.repo.update(id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Student not found')
    return updated as Student
  }

  async delete(id: number): Promise<void> {
    const student = await this.repo.findById(id)
    if (!student) throw new AppError('NOT_FOUND', 'Student not found')

    const hasDeps = await this.repo.hasDependents(id)
    if (hasDeps) {
      throw new AppError(
        'STUDENT_HAS_SUBMISSIONS',
        'Student cannot be deleted because they have attendance, submissions, or grades'
      )
    }
    await this.repo.delete(id)
  }
}