// =====================================================
// School Program Service — Business logic
// Validates school/program matching and cascade deactivation
// =====================================================

import { Knex } from 'knex'
import { SchoolProgramRepository } from '../repositories/schoolProgram.repository'
import { ProgramRepository } from '../repositories/program.repository'
import { AppError } from '../utils/AppError'
import {
  SchoolProgram,
  SchoolSpecialization,
} from '../models/interfaces/SchoolProgramInterfaces'
import { Program } from '../models/interfaces/ProgramInterfaces'

export class SchoolProgramService {
  private repo: SchoolProgramRepository
  private programRepo: ProgramRepository

  constructor(private knex: Knex) {
    this.repo = new SchoolProgramRepository(knex)
    this.programRepo = new ProgramRepository(knex)
  }

  // ==================== PROGRAMS ====================

  async list(schoolId: number): Promise<SchoolProgram[]> {
    return this.repo.findAllBySchool(schoolId)
  }

  async getAvailable(schoolId: number): Promise<Program[]> {
    return this.repo.getAvailablePrograms(schoolId)
  }

  async activate(schoolId: number, programId: number, userId?: number): Promise<SchoolProgram> {
    // Verify school exists
    const school = await this.knex('schools').where('id', schoolId).first()
    if (!school) throw new AppError('NOT_FOUND', 'School not found')

    // Verify program exists
    const program = await this.programRepo.findById(programId)
    if (!program) throw new AppError('NOT_FOUND', 'Program not found')

    // Validate education_level matches school's education_level
    if (program.education_level !== school.education_level) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Program education_level '${program.education_level}' does not match school's education_level '${school.education_level}'`
      )
    }

    // Check if already activated (uniqueness)
    const existing = await this.repo.findBySchoolAndProgram(schoolId, programId)
    if (existing) {
      throw new AppError(
        'ALREADY_EXISTS',
        `Program is already ${existing.is_active ? 'active' : 'deactivated'} for this school`
      )
    }

    const id = await this.repo.insertSchoolProgram({
      school_id: schoolId,
      program_id: programId,
      activated_by: userId,
    })
    return this.repo.findById(id) as Promise<SchoolProgram>
  }

  async deactivate(id: number, schoolId: number): Promise<void> {
    // Verify exists + ownership
    const schoolProgram = await this.repo.findById(id, schoolId)
    if (!schoolProgram) throw new AppError('NOT_FOUND', 'School program not found')

    // Cascade deactivate related specializations
    await this.knex('school_specializations')
      .where('school_program_id', id)
      .update({ is_active: false })

    await this.repo.deactivateSchoolProgram(id, schoolId)
  }

  // ==================== SPECIALIZATIONS ====================

  async listSpecializations(schoolProgramId: number): Promise<SchoolSpecialization[]> {
    return this.repo.findAllBySchoolProgram(schoolProgramId)
  }
}
