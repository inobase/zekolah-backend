// =====================================================
// Grade Service
// =====================================================

import { Knex } from 'knex'
import { GradeRepository } from '../repositories/grade.repository'
import { StudentRepository } from '../repositories/student.repository'
import { SubjectRepository } from '../repositories/subject.repository'
import { AcademicYearRepository } from '../repositories/academic-year.repository'
import { TeacherRepository } from '../repositories/teacher.repository'
import { Grade, UpdateGradeInput } from '../models/interfaces/GradeInterfaces'
import { CreateGradeInput, GradeFilterInput } from '../validators/grade.validator'
import { AppError } from '../utils/AppError'

export class GradeService {
  private repo: GradeRepository
  private studentRepo: StudentRepository
  private subjectRepo: SubjectRepository
  private academicYearRepo: AcademicYearRepository
  private teacherRepo: TeacherRepository

  constructor(private knex: Knex) {
    this.repo = new GradeRepository(knex)
    this.studentRepo = new StudentRepository(knex)
    this.subjectRepo = new SubjectRepository(knex)
    this.academicYearRepo = new AcademicYearRepository(knex)
    this.teacherRepo = new TeacherRepository(knex)
  }

  async list(filter: GradeFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, student_id, subject_id, assessment_type } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ student_id, subject_id, assessment_type, limit, offset }),
      this.repo.count({ student_id, subject_id, assessment_type }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Grade> {
    const grade = await this.repo.findById(id)
    if (!grade) throw new AppError('NOT_FOUND', 'Grade not found')
    return grade as Grade
  }

  async create(data: CreateGradeInput): Promise<Grade> {
    // Validate references
    const [student, subject, academicYear] = await Promise.all([
      this.studentRepo.findById(data.student_id),
      this.subjectRepo.findById(data.subject_id),
      this.academicYearRepo.findById(data.academic_year_id),
    ])

    if (!student) throw new AppError('NOT_FOUND', 'Student not found')
    if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')
    if (!academicYear) throw new AppError('NOT_FOUND', 'Academic year not found')

    if (data.teacher_id) {
      const teacher = await this.teacherRepo.findById(data.teacher_id)
      if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
    }

    // Validate score does not exceed max_score
    if (data.score > data.max_score) {
      throw new AppError('VALIDATION_ERROR', 'Score cannot exceed max_score')
    }

    const id = await this.repo.create(data)
    const result = await this.repo.findById(id)
    return result as Grade
  }

  async update(id: number, data: UpdateGradeInput): Promise<Grade> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Grade not found')

    const updates = { ...data } as Partial<Grade>
    if (data.score !== undefined && data.max_score !== undefined && data.score !== null && data.max_score !== null && data.score > data.max_score) {
      throw new AppError('VALIDATION_ERROR', 'Score cannot exceed max_score')
    }

    const updated = await this.repo.update(id, updates)
    if (!updated) throw new AppError('NOT_FOUND', 'Grade not found')

    const result = await this.repo.findById(id)
    return result as Grade
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Grade not found')
    const deleted = await this.repo.delete(id)
    if (!deleted) throw new AppError('NOT_FOUND', 'Grade not found')
  }
}
