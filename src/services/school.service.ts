// =====================================================
// School Service — Business logic
// =====================================================

import { Knex } from 'knex'
import { SchoolRepository } from '../repositories/school.repository'
import { School } from '../models/interfaces/SchoolInterfaces'
import {
  CreateSchoolInput,
  UpdateSchoolInput,
  SchoolFilterInput,
} from '../validators/school.validator'
import { AppError } from '../utils/AppError'

export class SchoolService {
  private repo: SchoolRepository

  constructor(private knex: Knex) {
    this.repo = new SchoolRepository(knex)
  }

  async list(
    filter: SchoolFilterInput,
    allowedSchoolIds?: number[] | null
  ): Promise<{
    data: School[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, search, status, education_level } = filter
    const offset = (page - 1) * limit
    // Apply school_id restriction only when an explicit list is provided.
    // undefined = no restriction (admin / super_admin); [] = no schools accessible.
    const ids =
      allowedSchoolIds === undefined ? undefined : allowedSchoolIds ?? []
    const [data, total] = await Promise.all([
      this.repo.findAll({ search, status, education_level, limit, offset, ids }),
      this.repo.count({ search, status, education_level, ids }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<School> {
    const school = await this.repo.findById(id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')
    return school
  }

  async create(data: CreateSchoolInput): Promise<School> {
    const existing = await this.repo.findByCode(data.code)
    if (existing) {
      throw new AppError('ALREADY_EXISTS', 'School code already exists')
    }
    return this.repo.create(data)
  }

  async update(id: number, data: UpdateSchoolInput): Promise<School> {
    if (data.code) {
      const existing = await this.repo.findByCode(data.code)
      if (existing && existing.id !== id) {
        throw new AppError('ALREADY_EXISTS', 'School code already exists')
      }
    }
    const updated = await this.repo.update(id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'School not found')
    return updated
  }

  async delete(id: number): Promise<void> {
    const school = await this.repo.findById(id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')
    const hasDeps = await this.repo.hasDependents(id)
    if (hasDeps) {
      throw new AppError(
        'SCHOOL_HAS_DEPENDENTS',
        'School cannot be deleted because it has students, teachers, or classes'
      )
    }
    await this.repo.delete(id)
  }
}