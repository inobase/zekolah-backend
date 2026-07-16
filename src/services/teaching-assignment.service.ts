// =====================================================
// TeachingAssignment Service
// =====================================================

import { Knex } from 'knex'
import { TeachingAssignmentRepository } from '../repositories/teaching-assignment.repository'
import { TeacherRepository } from '../repositories/teacher.repository'
import { ClassRepository } from '../repositories/class.repository'
import { SubjectRepository } from '../repositories/subject.repository'
import { AcademicYearRepository } from '../repositories/academic-year.repository'
import { TeachingAssignment, UpdateTeachingAssignmentInput } from '../models/interfaces/TeachingAssignmentInterfaces'
import { CreateTeachingAssignmentInput, TeachingAssignmentFilterInput } from '../validators/teaching-assignment.validator'
import { AppError } from '../utils/AppError'

export class TeachingAssignmentService {
  private repo: TeachingAssignmentRepository
  private teacherRepo: TeacherRepository
  private classRepo: ClassRepository
  private subjectRepo: SubjectRepository
  private academicYearRepo: AcademicYearRepository

  constructor(private knex: Knex) {
    this.repo = new TeachingAssignmentRepository(knex)
    this.teacherRepo = new TeacherRepository(knex)
    this.classRepo = new ClassRepository(knex)
    this.subjectRepo = new SubjectRepository(knex)
    this.academicYearRepo = new AcademicYearRepository(knex)
  }

  async list(filter: TeachingAssignmentFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, teacher_id, class_id, subject_id } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ teacher_id, class_id, subject_id, limit, offset }),
      this.repo.count({ teacher_id, class_id, subject_id }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<TeachingAssignment> {
    const assignment = await this.repo.findById(id)
    if (!assignment) throw new AppError('NOT_FOUND', 'Teaching assignment not found')
    return assignment as TeachingAssignment
  }

  async create(data: CreateTeachingAssignmentInput): Promise<TeachingAssignment> {
    // Validate teacher exists
    const teacher = await this.teacherRepo.findById(data.teacher_id)
    if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')

    // Validate class exists
    const cls = await this.classRepo.findById(data.class_id)
    if (!cls) throw new AppError('NOT_FOUND', 'Class not found')

    // Validate subject exists
    const subject = await this.subjectRepo.findById(data.subject_id)
    if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')

    // Validate academic year exists
    const academicYear = await this.academicYearRepo.findById(data.academic_year_id)
    if (!academicYear) throw new AppError('NOT_FOUND', 'Academic year not found')

    // Check duplicate
    const existing = await this.repo.findByUniqueFields(data)
    if (existing) throw new AppError('ALREADY_EXISTS', 'Teaching assignment already exists')

    const id = await this.repo.create(data)
    const result = await this.repo.findById(id)
    return result as TeachingAssignment
  }

  async update(id: number, data: UpdateTeachingAssignmentInput): Promise<TeachingAssignment> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Teaching assignment not found')

    const updates: Partial<Record<keyof UpdateTeachingAssignmentInput, number | null>> = {}
    for (const key of ['teacher_id', 'class_id', 'subject_id', 'academic_year_id'] as const) {
      if (data[key] !== undefined) updates[key] = data[key]
    }

    // Validate referenced entities for changed fields
    if (updates.teacher_id) {
      const teacher = await this.teacherRepo.findById(updates.teacher_id)
      if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
    }
    if (updates.class_id) {
      const cls = await this.classRepo.findById(updates.class_id)
      if (!cls) throw new AppError('NOT_FOUND', 'Class not found')
    }
    if (updates.subject_id) {
      const subject = await this.subjectRepo.findById(updates.subject_id)
      if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')
    }
    if (updates.academic_year_id) {
      const academicYear = await this.academicYearRepo.findById(updates.academic_year_id)
      if (!academicYear) throw new AppError('NOT_FOUND', 'Academic year not found')
    }

    const updated = await this.repo.update(id, updates as {})
    if (!updated) throw new AppError('NOT_FOUND', 'Teaching assignment not found')

    const result = await this.repo.findById(id)
    return result as TeachingAssignment
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Teaching assignment not found')
    const deleted = await this.repo.delete(id)
    if (!deleted) throw new AppError('NOT_FOUND', 'Teaching assignment not found')
  }
}
