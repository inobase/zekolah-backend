// =====================================================
// Teacher Service
// =====================================================

import { Knex } from 'knex'
import { TeacherRepository } from '../repositories/teacher.repository'
import { SchoolRepository } from '../repositories/school.repository'
import { UserRepository } from '../repositories/user.repository'
import { Teacher } from '../models/interfaces/TeacherInterfaces'
import {
  CreateTeacherInput,
  UpdateTeacherInput,
  TeacherFilterInput,
} from '../validators/teacher.validator'
import { AppError } from '../utils/AppError'

export class TeacherService {
  private repo: TeacherRepository
  private schoolRepo: SchoolRepository
  private userRepo: UserRepository

  constructor(private knex: Knex) {
    this.repo = new TeacherRepository(knex)
    this.schoolRepo = new SchoolRepository(knex)
    this.userRepo = new UserRepository(knex)
  }

  async list(filter: TeacherFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, school_id, search } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ school_id, search, limit, offset }),
      this.repo.count({ school_id, search }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Teacher> {
    const teacher = await this.repo.findById(id)
    if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
    return teacher as Teacher
  }

  async create(data: CreateTeacherInput): Promise<Teacher> {
    // Validate school exists
    const school = await this.schoolRepo.findById(data.school_id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')

    // Validate user exists
    const user = await this.userRepo.findById(data.user_id)
    if (!user) throw new AppError('NOT_FOUND', 'User not found')

    // Validate NIP uniqueness
    if (data.nip) {
      const existing = await this.repo.findByNip(data.nip)
      if (existing) throw new AppError('ALREADY_EXISTS', 'NIP already exists')
    }

    return this.repo.create(data)
  }

  async update(id: number, data: UpdateTeacherInput): Promise<Teacher> {
    if (data.nip) {
      const existing = await this.repo.findByNip(data.nip)
      if (existing && existing.id !== id) {
        throw new AppError('ALREADY_EXISTS', 'NIP already exists')
      }
    }
    const updated = await this.repo.update(id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Teacher not found')
    return updated as Teacher
  }

  async delete(id: number): Promise<void> {
    const teacher = await this.repo.findById(id)
    if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
    await this.repo.delete(id)
  }
}