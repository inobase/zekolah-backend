// =====================================================
// Program Service — Business logic for programs & specializations
// =====================================================

import { Knex } from 'knex'
import { ProgramRepository } from '../repositories/program.repository'
import {
  Program,
  ProgramCreateInput,
  ProgramUpdateInput,
  Specialization,
  SpecializationCreateInput,
  SpecializationUpdateInput,
} from '../models/interfaces/ProgramInterfaces'
import { AppError } from '../utils/AppError'
import { JurusanEducationLevel } from '../models/interfaces/ProgramInterfaces'

const JURUSAN_ELIGIBLE_LEVELS: JurusanEducationLevel[] = ['3B', '5A', '5B'] as const

export class ProgramService {
  private repo: ProgramRepository

  constructor(private knex: Knex) {
    this.repo = new ProgramRepository(knex)
  }

  // ==================== PROGRAMS ====================

  async list({
    page = 1,
    limit = 50,
    search,
    education_level,
    is_active,
  }: {
    page?: number
    limit?: number
    search?: string
    education_level?: JurusanEducationLevel
    is_active?: boolean
  }): Promise<{ data: Program[]; pagination: { page: number; limit: number; total: number } }> {
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ search, education_level, is_active, limit, offset }),
      this.repo.count({ search, education_level, is_active }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Program> {
    const program = await this.repo.findById(id)
    if (!program) throw new AppError('NOT_FOUND', 'Program not found')
    return program
  }

  async create(data: ProgramCreateInput): Promise<Program> {
    // Validate education_level
    if (!JURUSAN_ELIGIBLE_LEVELS.includes(data.education_level)) {
      throw new AppError('VALIDATION_ERROR', 'Program education_level must be 3B (SMK), 5A (PT), or 5B (PTKIN)')
    }
    // Check code uniqueness
    const existing = await this.repo.findByCode(data.code)
    if (existing) {
      throw new AppError('ALREADY_EXISTS', 'Program code already exists')
    }
    const id = await this.repo.create(data)
    return this.repo.findById(id) as Promise<Program>
  }

  async update(id: number, data: Partial<ProgramUpdateInput>): Promise<Program> {
    const program = await this.repo.findById(id)
    if (!program) throw new AppError('NOT_FOUND', 'Program not found')
    if (data.education_level && !JURUSAN_ELIGIBLE_LEVELS.includes(data.education_level)) {
      throw new AppError('VALIDATION_ERROR', 'Program education_level must be 3B (SMK), 5A (PT), or 5B (PTKIN)')
    }
    if (data.code) {
      const existing = await this.repo.findByCode(data.code)
      if (existing && existing.id !== id) {
        throw new AppError('ALREADY_EXISTS', 'Program code already exists')
      }
    }
    await this.repo.update(id, data)
    return this.repo.findById(id) as Promise<Program>
  }

  async deactivate(id: number): Promise<void> {
    const program = await this.repo.findById(id)
    if (!program) throw new AppError('NOT_FOUND', 'Program not found')
    await this.repo.deactivate(id)
  }

  // ==================== SPECIALIZATIONS ====================

  async listSpecializations(
    programId: number,
    {
      page = 1,
      limit = 50,
      search,
      is_active,
    }: {
      page?: number
      limit?: number
      search?: string
      is_active?: boolean
    } = {}
  ): Promise<{ data: Specialization[]; pagination: { page: number; limit: number; total: number } }> {
    // Validate program exists
    const program = await this.repo.findById(programId)
    if (!program) throw new AppError('NOT_FOUND', 'Program not found')
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.specializationFindAll({ program_id: programId, search, is_active, limit, offset }),
      this.repo.specializationCount({ program_id: programId, search, is_active }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getSpecializationById(id: number): Promise<Specialization> {
    const spec = await this.repo.specializationFindById(id)
    if (!spec) throw new AppError('NOT_FOUND', 'Specialization not found')
    return spec
  }

  async createSpecialization(data: SpecializationCreateInput): Promise<Specialization> {
    // Validate program exists
    const program = await this.repo.findById(data.program_id)
    if (!program) throw new AppError('NOT_FOUND', 'Program not found')
    // Check uniqueness of code within program
    const existing = await this.repo.specializationFindByProgram(data.program_id)
    if (existing.find((s) => s.code.toLowerCase() === data.code.toLowerCase())) {
      throw new AppError('ALREADY_EXISTS', `Specialization code "${data.code}" already exists for this program`)
    }
    const id = await this.repo.specializationCreate(data)
    return this.repo.specializationFindById(id) as Promise<Specialization>
  }

  async updateSpecialization(
    id: number,
    data: Partial<SpecializationUpdateInput>
  ): Promise<Specialization> {
    const spec = await this.repo.specializationFindById(id)
    if (!spec) throw new AppError('NOT_FOUND', 'Specialization not found')
    if (data.code) {
      const newCode = data.code
      const existing = await this.repo.specializationFindByProgram(spec.program_id)
      if (existing.find((s) => s.code.toLowerCase() === newCode.toLowerCase() && s.id !== id)) {
        throw new AppError('ALREADY_EXISTS', `Specialization code "${newCode}" already exists for this program`)
      }
    }
    await this.repo.specializationUpdate(id, data)
    return this.repo.specializationFindById(id) as Promise<Specialization>
  }

  async deactivateSpecialization(id: number): Promise<void> {
    const spec = await this.repo.specializationFindById(id)
    if (!spec) throw new AppError('NOT_FOUND', 'Specialization not found')
    await this.repo.specializationDeactivate(id)
  }
}
