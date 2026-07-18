// =====================================================
// Class Repository
// =====================================================

import { Knex } from 'knex'
import {
  Class,
  ClassWithDetails,
  CreateClassInput,
  UpdateClassInput,
} from '../models/interfaces/ClassInterfaces'

export class ClassRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    school_id?: number
    academic_year_id?: number
    grade?: string
    limit: number
    offset: number
  }): Promise<ClassWithDetails[]> {
    const q = this.knex('classes')
      .join('academic_years', 'classes.academic_year_id', 'academic_years.id')
      .join('schools', 'classes.school_id', 'schools.id')
      .leftJoin('teachers as advisor', 'classes.class_advisor_id', 'advisor.id')
      .leftJoin('users as advisor_user', 'advisor.user_id', 'advisor_user.id')
      .select(
        'classes.*',
        'academic_years.year as academic_year_label',
        'schools.name as school_name',
        'advisor_user.name as class_advisor_name'
      )

    if (filter.school_id) q.where('classes.school_id', filter.school_id)
    if (filter.academic_year_id) q.where('classes.academic_year_id', filter.academic_year_id)
    if (filter.grade) q.where('classes.grade', filter.grade)

    return q.orderBy('classes.grade').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: { school_id?: number; academic_year_id?: number; grade?: string }): Promise<number> {
    const q = this.knex('classes').count<{ count: string }[]>('* as count').first()
    if (filter.school_id) q.where('classes.school_id', filter.school_id)
    if (filter.academic_year_id) q.where('classes.academic_year_id', filter.academic_year_id)
    if (filter.grade) q.where('classes.grade', filter.grade)
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<ClassWithDetails | null> {
    const row = await this.knex('classes')
      .join('academic_years', 'classes.academic_year_id', 'academic_years.id')
      .join('schools', 'classes.school_id', 'schools.id')
      .leftJoin('teachers as advisor', 'classes.class_advisor_id', 'advisor.id')
      .leftJoin('users as advisor_user', 'advisor.user_id', 'advisor_user.id')
      .where('classes.id', id)
      .select(
        'classes.*',
        'academic_years.year as academic_year_label',
        'schools.name as school_name',
        'advisor_user.name as class_advisor_name'
      )
      .first()
    return row ?? null
  }

  async findByIdScoped(id: number, schoolId: number): Promise<ClassWithDetails | null> {
    const row = await this.knex('classes')
      .join('academic_years', 'classes.academic_year_id', 'academic_years.id')
      .join('schools', 'classes.school_id', 'schools.id')
      .leftJoin('teachers as advisor', 'classes.class_advisor_id', 'advisor.id')
      .leftJoin('users as advisor_user', 'advisor.user_id', 'advisor_user.id')
      .where('classes.id', id)
      .andWhere('classes.school_id', schoolId)
      .select(
        'classes.*',
        'academic_years.year as academic_year_label',
        'schools.name as school_name',
        'advisor_user.name as class_advisor_name'
      )
      .first()
    return row ?? null
  }

  async create(data: CreateClassInput): Promise<Class> {
    const now = new Date()
    const [id] = await this.knex('classes').insert({
      school_id: data.school_id,
      academic_year_id: data.academic_year_id,
      name: data.name,
      grade: data.grade,
      class_advisor_id: data.class_advisor_id ?? null,
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) throw new Error('Failed to retrieve created class')
    return created as Class
  }

  async update(id: number, data: UpdateClassInput): Promise<Class | null> {
    await this.knex('classes').where({ id }).update({ ...data, updated_at: new Date() })
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('classes').where({ id }).del()
    return deleted > 0
  }

  async hasStudents(id: number): Promise<boolean> {
    const classStudentCount = await this.knex('class_students').where({ class_id: id }).count<{ count: string }[]>('* as count').first()
    const directCount = await this.knex('students').where({ class_id: id }).count<{ count: string }[]>('* as count').first()
    return Number((classStudentCount as any)?.count ?? 0) > 0 || Number((directCount as any)?.count ?? 0) > 0
  }
}