// =====================================================
// School Subject Service — Business logic for school subjects
// =====================================================

import { Knex } from 'knex'
import { SchoolSubjectRepository } from '../repositories/schoolSubject.repository'
import {
  SchoolSubject,
  SchoolSubjectCreateInput,
  SchoolSubjectUpdateInput,
  SubjectType,
} from '../models/interfaces/SchoolSubjectInterfaces'
import { AppError } from '../utils/AppError'

const SUBJECT_TYPES: SubjectType[] = ['UMUM', 'DD', 'DP', 'SP']

export class SchoolSubjectService {
  private repo: SchoolSubjectRepository

  constructor(private knex: Knex) {
    this.repo = new SchoolSubjectRepository(knex)
  }

  async list({
    page = 1,
    limit = 50,
    school_id,
    specialization_id,
    subject_type,
    search,
  }: {
    page?: number
    limit?: number
    school_id?: number
    specialization_id?: number
    subject_type?: SubjectType
    search?: string
  }): Promise<{ data: SchoolSubject[]; pagination: { page: number; limit: number; total: number } }> {
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ school_id, specialization_id, subject_type, search, limit, offset }),
      this.repo.count({ school_id, specialization_id, subject_type, search }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number, schoolId?: number): Promise<SchoolSubject> {
    const subject = await this.repo.findByIdWithSchool(id, schoolId!)
    if (!subject) throw new AppError('NOT_FOUND', 'School subject not found')
    return subject
  }

  async create(data: SchoolSubjectCreateInput): Promise<SchoolSubject> {
    // Validate subject_type
    if (!SUBJECT_TYPES.includes(data.subject_type)) {
      throw new AppError('VALIDATION_ERROR', 'subject_type must be one of: UMUM, DD, DP, SP')
    }
    // Validate jp_per_minggu > 0
    if (data.jp_per_minggu <= 0) {
      throw new AppError('VALIDATION_ERROR', 'jp_per_minggu must be greater than 0')
    }
    // Auto-calculate jp_per_semester if not provided
    const subjectData: SchoolSubjectCreateInput = {
      ...data,
      jp_per_semester: data.jp_per_semester || data.jp_per_minggu * 18,
      theory_hours: data.theory_hours || 0,
      practice_hours: data.practice_hours || 0,
      customizable: data.customizable ?? true,
    }
    const id = await this.repo.create(subjectData)
    return this.repo.findByIdWithSchool(id, data.school_id) as Promise<SchoolSubject>
  }

  async update(id: number, data: Partial<SchoolSubjectUpdateInput>, schoolId?: number): Promise<SchoolSubject> {
    const existing = await this.repo.findByIdWithSchool(id, schoolId!)
    if (!existing) throw new AppError('NOT_FOUND', 'School subject not found')
    if (data.subject_type && !SUBJECT_TYPES.includes(data.subject_type)) {
      throw new AppError('VALIDATION_ERROR', 'subject_type must be one of: UMUM, DD, DP, SP')
    }
    if (data.jp_per_minggu !== undefined && data.jp_per_minggu <= 0) {
      throw new AppError('VALIDATION_ERROR', 'jp_per_minggu must be greater than 0')
    }
    // Auto-recalculate jp_per_semester if jp_per_minggu changed
    if (data.jp_per_minggu !== undefined) {
      data.jp_per_semester = (data.jp_per_semester ?? data.jp_per_minggu * 18)
    }
    await this.repo.update(id, data)
    return this.repo.findByIdWithSchool(id, schoolId!) as Promise<SchoolSubject>
  }

  async delete(id: number, schoolId: number): Promise<void> {
    const existing = await this.repo.findByIdWithSchool(id, schoolId)
    if (!existing) throw new AppError('NOT_FOUND', 'School subject not found')
    if (existing.school_id !== schoolId) {
      throw new AppError('FORBIDDEN', 'Cannot delete subject from another school')
    }
    await this.repo.delete(id, schoolId)
  }

  // Create school subjects from specialization data (bulk)
  async createFromSpecialization(schoolId: number, specializationId: number, subjects: Omit<SchoolSubjectCreateInput, 'school_id'>[]): Promise<SchoolSubject[]> {
    const created: SchoolSubject[] = []
    for (const subject of subjects) {
      // Validate
      if (!SUBJECT_TYPES.includes(subject.subject_type)) {
        throw new AppError('VALIDATION_ERROR', 'subject_type must be one of: UMUM, DD, DP, SP')
      }
      if (subject.jp_per_minggu <= 0) {
        throw new AppError('VALIDATION_ERROR', 'jp_per_minggu must be greater than 0')
      }
      const createdSubject = await this.create({
        ...subject,
        school_id: schoolId,
        jp_per_semester: subject.jp_per_semester || subject.jp_per_minggu * 18,
      } as SchoolSubjectCreateInput)
      created.push(createdSubject)
    }
    return created
  }

  // Get all subjects for a school (grouped by specialization)
  async findBySpecialization(schoolId: number, specializationId: number): Promise<SchoolSubject[]> {
    return this.repo.findBySpecialization(schoolId, specializationId)
  }
}
