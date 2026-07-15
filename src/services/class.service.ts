// =====================================================
// Class Service
// =====================================================

import { Knex } from 'knex'
import { ClassRepository } from '../repositories/class.repository'
import { SchoolRepository } from '../repositories/school.repository'
import { AcademicYearRepository } from '../repositories/academic-year.repository'
import { Class } from '../models/interfaces/ClassInterfaces'
import {
  CreateClassInput,
  UpdateClassInput,
  ClassFilterInput,
} from '../validators/class.validator'
import { AppError } from '../utils/AppError'

export class ClassService {
  private repo: ClassRepository
  private schoolRepo: SchoolRepository
  private ayRepo: AcademicYearRepository

  constructor(private knex: Knex) {
    this.repo = new ClassRepository(knex)
    this.schoolRepo = new SchoolRepository(knex)
    this.ayRepo = new AcademicYearRepository(knex)
  }

  async list(filter: ClassFilterInput): Promise<{
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

  async getById(id: number): Promise<Class> {
    const cls = await this.repo.findById(id)
    if (!cls) throw new AppError('NOT_FOUND', 'Class not found')
    return cls as Class
  }

  async create(data: CreateClassInput): Promise<Class> {
    const school = await this.schoolRepo.findById(data.school_id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')

    const ay = await this.ayRepo.findById(data.academic_year_id)
    if (!ay) throw new AppError('NOT_FOUND', 'Academic year not found')

    return this.repo.create(data)
  }

  async update(id: number, data: UpdateClassInput): Promise<Class> {
    const updated = await this.repo.update(id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Class not found')
    return updated as Class
  }

  async delete(id: number): Promise<void> {
    const cls = await this.repo.findById(id)
    if (!cls) throw new AppError('NOT_FOUND', 'Class not found')

    const hasStudents = await this.repo.hasStudents(id)
    if (hasStudents) {
      throw new AppError(
        'CLASS_HAS_STUDENTS',
        'Class cannot be deleted because it has assigned students'
      )
    }
    await this.repo.delete(id)
  }
}