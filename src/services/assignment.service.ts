// =====================================================
// Assignment Service
// =====================================================

import { Knex } from 'knex'
import { AssignmentRepository } from '../repositories/assignment.repository'
import { TeacherRepository } from '../repositories/teacher.repository'
import { ClassRepository } from '../repositories/class.repository'
import { SubjectRepository } from '../repositories/subject.repository'
import { AcademicYearRepository } from '../repositories/academic-year.repository'
import { Assignment, UpdateAssignmentInput } from '../models/interfaces/AssignmentInterfaces'
import { CreateAssignmentInput, AssignmentFilterInput } from '../validators/assignment.validator'
import { AppError } from '../utils/AppError'

export class AssignmentService {
  private repo: AssignmentRepository
  private teacherRepo: TeacherRepository
  private classRepo: ClassRepository
  private subjectRepo: SubjectRepository
  private academicYearRepo: AcademicYearRepository

  constructor(private knex: Knex) {
    this.repo = new AssignmentRepository(knex)
    this.teacherRepo = new TeacherRepository(knex)
    this.classRepo = new ClassRepository(knex)
    this.subjectRepo = new SubjectRepository(knex)
    this.academicYearRepo = new AcademicYearRepository(knex)
  }

  async list(filter: AssignmentFilterInput): Promise<{
    data: any[]
    pagination: { page: number; limit: number; total: number }
  }> {
    const { page, limit, class_id, subject_id, teacher_id } = filter
    const offset = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.repo.findAll({ class_id, subject_id, teacher_id, limit, offset }),
      this.repo.count({ class_id, subject_id, teacher_id }),
    ])
    return { data, pagination: { page, limit, total } }
  }

  async getById(id: number): Promise<Assignment> {
    const assignment = await this.repo.findById(id)
    if (!assignment) throw new AppError('NOT_FOUND', 'Assignment not found')
    return assignment as Assignment
  }

  async create(data: CreateAssignmentInput): Promise<Assignment> {
    // Validate references
    const [teacher, cls, subject, academicYear] = await Promise.all([
      this.teacherRepo.findById(data.teacher_id),
      this.classRepo.findById(data.class_id),
      this.subjectRepo.findById(data.subject_id),
      this.academicYearRepo.findById(data.academic_year_id),
    ])

    if (!teacher) throw new AppError('NOT_FOUND', 'Teacher not found')
    if (!cls) throw new AppError('NOT_FOUND', 'Class not found')
    if (!subject) throw new AppError('NOT_FOUND', 'Subject not found')
    if (!academicYear) throw new AppError('NOT_FOUND', 'Academic year not found')

    const id = await this.repo.create(data)
    const result = await this.repo.findById(id)
    return result as Assignment
  }

  async update(id: number, data: UpdateAssignmentInput): Promise<Assignment> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Assignment not found')

    // Check if submissions exist before deleting/updating
    if (await this.repo.hasDependents(id)) {
      // Allow update of title, description, etc., but prevent destructive changes
    }

    const updates = { ...data } as Partial<Assignment>
    const updated = await this.repo.update(id, updates)
    if (!updated) throw new AppError('NOT_FOUND', 'Assignment not found')

    const result = await this.repo.findById(id)
    return result as Assignment
  }

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Assignment not found')

    // Check if there are dependent submissions
    const hasSubmissions = await this.repo.hasDependents(id)
    if (hasSubmissions) {
      throw new AppError('ALREADY_EXISTS', 'Cannot delete assignment with existing submissions')
    }

    const deleted = await this.repo.delete(id)
    if (!deleted) throw new AppError('NOT_FOUND', 'Assignment not found')
  }
}
