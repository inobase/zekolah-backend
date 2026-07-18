// =====================================================
// Academic Year Repository
// =====================================================

import { Knex } from 'knex'
import { AcademicYear, CreateAcademicYearInput, UpdateAcademicYearInput } from '../models/interfaces/AcademicYearInterfaces'

export class AcademicYearRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: {
    school_id?: number
    status?: string
    search?: string
    limit: number
    offset: number
  }): Promise<(AcademicYear & { school_name: string })[]> {
    const q = this.knex('academic_years')
      .join('schools', 'academic_years.school_id', 'schools.id')
      .select(
        'academic_years.*',
        'schools.name as school_name'
      )

    if (filter.school_id) q.where('academic_years.school_id', filter.school_id)
    if (filter.status) q.where('academic_years.status', filter.status)
    if (filter.search) {
      q.where((qb) => {
        qb.whereLike('academic_years.year', `%${filter.search}%`)
          .orWhereLike('schools.name', `%${filter.search}%`)
      })
    }

    return q.orderBy('academic_years.start_date', 'desc').limit(filter.limit).offset(filter.offset)
  }

  async count(filter: { school_id?: number; status?: string; search?: string }): Promise<number> {
    const q = this.knex('academic_years').count<{ count: string }[]>('* as count').first()
    if (filter.school_id) q.where('academic_years.school_id', filter.school_id)
    if (filter.status) q.where('academic_years.status', filter.status)
    if (filter.search) {
      q.where((qb: any) => {
        qb.whereLike('academic_years.year', `%${filter.search}%`)
          .orWhereLike('schools.name', `%${filter.search}%`)
      })
    }
    const result = await q
    return Number((result as any)?.count ?? 0)
  }

  async findById(id: number): Promise<AcademicYear & { school_name: string } | null> {
    const row = await this.knex('academic_years')
      .join('schools', 'academic_years.school_id', 'schools.id')
      .select('academic_years.*', 'schools.name as school_name')
      .where('academic_years.id', id)
      .first()
    return row ?? null
  }

  async findByIdScoped(id: number, schoolId: number): Promise<AcademicYear & { school_name: string } | null> {
    const row = await this.knex('academic_years')
      .join('schools', 'academic_years.school_id', 'schools.id')
      .select('academic_years.*', 'schools.name as school_name')
      .where('academic_years.id', id)
      .andWhere('academic_years.school_id', schoolId)
      .first()
    return row ?? null
  }

  async create(data: CreateAcademicYearInput): Promise<AcademicYear> {
    const now = new Date()
    const [id] = await this.knex('academic_years').insert({
      school_id: data.school_id,
      year: data.year,
      start_date: data.start_date,
      end_date: data.end_date,
      semester: data.semester ?? 'ganjil',
      status: data.status ?? 'upcoming',
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) throw new Error('Failed to retrieve created academic year')
    return created as AcademicYear
  }

  async update(id: number, data: UpdateAcademicYearInput): Promise<AcademicYear | null> {
    await this.knex('academic_years').where({ id }).update({ ...data, updated_at: new Date() })
    return this.findById(id)
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await this.knex('academic_years').where({ id }).del()
    return deleted > 0
  }
}