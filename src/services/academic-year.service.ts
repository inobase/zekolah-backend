// =====================================================
// Academic Year Service
// =====================================================

import { Knex } from 'knex'
import { AcademicYearRepository } from '../repositories/academic-year.repository'
import { SchoolRepository } from '../repositories/school.repository'
import { AcademicYear } from '../models/interfaces/AcademicYearInterfaces'
import {
  CreateAcademicYearInput,
  UpdateAcademicYearInput,
  AcademicYearFilterInput,
} from '../validators/academic-year.validator'
import { AppError } from '../utils/AppError'

export class AcademicYearService {
  private repo: AcademicYearRepository
  private schoolRepo: SchoolRepository

  constructor(private knex: Knex) {
    this.repo = new AcademicYearRepository(knex)
    this.schoolRepo = new SchoolRepository(knex)
  }

  async list(filter: AcademicYearFilterInput): Promise<{
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

  async getById(id: number): Promise<AcademicYear> {
    const ay = await this.repo.findById(id)
    if (!ay) throw new AppError('NOT_FOUND', 'Academic year not found')
    return ay as AcademicYear
  }

  async create(data: CreateAcademicYearInput): Promise<AcademicYear> {
    const school = await this.schoolRepo.findById(data.school_id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')

    // Validate date order
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    if (start >= end) {
      throw new AppError('VALIDATION_ERROR', 'start_date must be before end_date')
    }

    return this.repo.create(data)
  }

  async update(id: number, data: UpdateAcademicYearInput): Promise<AcademicYear> {
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date)
      const end = new Date(data.end_date)
      if (start >= end) {
        throw new AppError('VALIDATION_ERROR', 'start_date must be before end_date')
      }
    }

    const updated = await this.repo.update(id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Academic year not found')
    return updated as AcademicYear
  }

  async delete(id: number): Promise<void> {
    const ay = await this.repo.findById(id)
    if (!ay) throw new AppError('NOT_FOUND', 'Academic year not found')
    await this.repo.delete(id)
  }
}