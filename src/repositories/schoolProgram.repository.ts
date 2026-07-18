// =====================================================
// School Program Repository
// CRUD for school_programs and school_specializations
// =====================================================

import { Knex } from 'knex'
import {
  SchoolProgram,
  SchoolProgramCreateInput,
  SchoolSpecialization,
  SchoolSpecializationCreateInput,
} from '../models/interfaces/SchoolProgramInterfaces'
import { Program } from '../models/interfaces/ProgramInterfaces'

export class SchoolProgramRepository {
  constructor(private knex: Knex) {}

  // ==================== SCHOOL PROGRAMS ====================

  async findAllBySchool(schoolId: number): Promise<SchoolProgram[]> {
    return this.knex<SchoolProgram>('school_programs')
      .where('school_id', schoolId)
      .leftJoin('programs', 'school_programs.program_id', 'programs.id')
      .select(
        'school_programs.*',
        'programs.id as program__id',
        'programs.code as program__code',
        'programs.name as program__name',
        'programs.description as program__description',
        'programs.education_level as program__education_level',
        'programs.is_active as program__is_active',
        'programs.created_at as program__created_at',
        'programs.updated_at as program__updated_at'
      )
      .orderBy('school_programs.id', 'desc')
  }

  async findById(id: number, schoolId?: number): Promise<SchoolProgram | null> {
    const q = this.knex<SchoolProgram>('school_programs')
      .leftJoin('programs', 'school_programs.program_id', 'programs.id')
      .select(
        'school_programs.*',
        'programs.id as program__id',
        'programs.code as program__code',
        'programs.name as program__name',
        'programs.description as program__description',
        'programs.education_level as program__education_level',
        'programs.is_active as program__is_active',
        'programs.created_at as program__created_at',
        'programs.updated_at as program__updated_at'
      )
      .where('school_programs.id', id)

    if (schoolId) q.andWhere('school_programs.school_id', schoolId)

    return (await q.first()) ?? null
  }

  async findBySchoolAndProgram(schoolId: number, programId: number): Promise<SchoolProgram | null> {
    return (await this.knex<SchoolProgram>('school_programs')
      .where({ school_id: schoolId, program_id: programId })
      .first()) ?? null
  }

  async getAvailablePrograms(schoolId: number): Promise<any[]> {
    const school = await this.knex('schools').where('id', schoolId).first()
    if (!school || !school.education_level) return []
    return this.knex<any>('programs')
      .where({ education_level: school.education_level, is_active: true })
      .orderBy('name', 'asc')
  }

  async insertSchoolProgram(data: SchoolProgramCreateInput): Promise<number> {
    const [id] = await this.knex('school_programs').insert({
      ...data,
      is_active: true,
      activated_at: new Date().toISOString(),
    })
    return id as number
  }

  async deactivateSchoolProgram(id: number, schoolId: number): Promise<void> {
    await this.knex('school_programs')
      .where({ id, school_id: schoolId })
      .update({ is_active: false })
  }

  // ==================== SCHOOL SPECIALIZATIONS ====================

  async findAllBySchoolProgram(schoolProgramId: number): Promise<SchoolSpecialization[]> {
    return this.knex<SchoolSpecialization>('school_specializations')
      .where('school_program_id', schoolProgramId)
      .leftJoin('specializations', 'school_specializations.specialization_id', 'specializations.id')
      .select(
        'school_specializations.*',
        'specializations.id as spec__id',
        'specializations.code as spec__code',
        'specializations.name as spec__name',
        'specializations.description as spec__description',
        'specializations.is_active as spec__is_active',
        'specializations.program_id as spec__program_id',
        'specializations.created_at as spec__created_at',
        'specializations.updated_at as spec__updated_at'
      )
      .orderBy('school_specializations.id', 'desc')
  }

  async findActiveBySchoolProgram(schoolProgramId: number): Promise<SchoolSpecialization[]> {
    return this.findAllBySchoolProgram(schoolProgramId)
      .then(rows => rows.filter(r => r.is_active))
  }

  async insertSchoolSpecialization(data: SchoolSpecializationCreateInput): Promise<number> {
    const [id] = await this.knex('school_specializations').insert(data)
    return id as number
  }

  async deactivateSchoolSpecialization(id: number, schoolProgramId: number): Promise<void> {
    await this.knex('school_specializations')
      .where({ id, school_program_id: schoolProgramId })
      .update({ is_active: false })
  }
}
