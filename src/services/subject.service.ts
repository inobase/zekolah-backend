// =====================================================
// Subject Service
// =====================================================

import { Knex } from 'knex'
import { SubjectRepository } from '../repositories/subject.repository'
import { SchoolRepository } from '../repositories/school.repository'
import { Subject } from '../models/interfaces/SubjectInterfaces'
import { CreateSubjectInput, UpdateSubjectInput, SubjectFilterInput } from '../validators/subject.validator'
import { AppError } from '../utils/AppError'

export class SubjectService {
  private repo: SubjectRepository
  private schoolRepo: SchoolRepository

  constructor(private knex: Knex) {
    this.repo = new SubjectRepository(knex)
    this.schoolRepo = new SchoolRepository(knex)
  }

  async list(filter: SubjectFilterInput): Promise<{ data: Subject[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit, search, school_id } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ search, limit, offset, school_id }),
      this.repo.count({ search, school_id }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Subject> {
    const subject = await this.repo.findById(id)
    if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')
    return subject
  }

  async create(data: CreateSubjectInput): Promise<Subject> {
    // Validate school exists
    const school = await this.schoolRepo.findById(data.school_id)
    if (!school) throw new AppError('NOT_FOUND', 'School not found')

    // Validate code uniqueness
    const existing = await this.repo.findByCode(data.code)
    if (existing) throw new AppError('ALREADY_EXISTS', 'Subject code already exists')

    return this.repo.create(data)
  }

  async update(id: number, data: UpdateSubjectInput): Promise<Subject> {
    if (data.code) {
      const existing = await this.repo.findByCode(data.code)
      if (existing && existing.id !== id) {
        throw new AppError('ALREADY_EXISTS', 'Subject code already exists')
      }
    }
    const updated = await this.repo.update(id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Subject not found')
    return updated
  }

  async delete(id: number): Promise<void> {
    const subject = await this.repo.findById(id)
    if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')

    const hasDeps = await this.repo.hasDependents(id)
    if (hasDeps) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Subject cannot be deleted because it has classes or assignments'
      )
    }
    await this.repo.delete(id)
  }
}