// =====================================================
// Schedule Repository
// CRUD for schedules and schedule time slots
// =====================================================

import { Knex } from 'knex'
import {
  Schedule,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  ScheduleFilterInput,
  ScheduleWithDetails,
  ScheduleTimeSlot,
  ScheduleTimeSlotCreateInput,
  Semester,
  DayOfWeek,
  ScheduleStatus,
} from '../models/interfaces/ScheduleInterfaces'

export class ScheduleRepository {
  constructor(private knex: Knex) {}

  async findAll(filter: Partial<ScheduleFilterInput & { limit?: number; offset?: number }>): Promise<Schedule[]> {
    const q = this.knex<Schedule>('schedules').select('*')
    if (filter.class_id) q.where('class_id', filter.class_id)
    if (filter.teacher_id) q.where('teacher_id', filter.teacher_id)
    if (filter.school_subject_id) q.where('school_subject_id', filter.school_subject_id)
    if (filter.academic_year_id) q.where('academic_year_id', filter.academic_year_id)
    if (filter.semester) q.where('semester', filter.semester)
    if (filter.status) q.where('status', filter.status)
    q.orderBy('id', 'desc')
    if (filter.limit) q.limit(filter.limit)
    if (filter.offset) q.offset(filter.offset)
    return q
  }

  async findById(id: number): Promise<Schedule | null> {
    return (await this.knex<Schedule>('schedules').where({ id }).first()) ?? null
  }

  async create(data: ScheduleCreateInput): Promise<number> {
    const [id] = await this.knex('schedules').insert(data)
    return id as number
  }

  async update(id: number, data: Partial<ScheduleUpdateInput>): Promise<void> {
    await this.knex('schedules').where({ id }).update(data)
  }

  async delete(id: number): Promise<void> {
    await this.knex('schedules').where({ id }).del()
  }

  /** All schedules for a class in a given academic year & semester */
  async findByClass(classId: number, academicYearId: number, semester: Semester): Promise<Schedule[]> {
    return this.knex<Schedule>('schedules')
      .where({ class_id: classId, academic_year_id: academicYearId, semester })
      .orderBy('id', 'asc')
  }

  /** All schedules for a teacher in a given academic year & semester */
  async findByTeacher(teacherId: number, academicYearId: number, semester: Semester): Promise<Schedule[]> {
    return this.knex<Schedule>('schedules')
      .where({ teacher_id: teacherId, academic_year_id: academicYearId, semester })
      .orderBy('id', 'asc')
  }

  /** Check for double-booking conflicts (class or teacher) in a given time range */
  async checkConflict(
    classId: number,
    teacherId: number,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    academicYearId?: number,
    excludeScheduleId?: number
  ): Promise<{ classConflict: boolean; teacherConflict: boolean; details: any[] }> {
    // We need to join schedules with time_slots to check real overlaps
    const base = this.knex('schedule_time_slots')
      .join('schedules', 'schedules.id', '=', 'schedule_time_slots.schedule_id')
      .where('schedule_time_slots.day_of_week', dayOfWeek)
      // Time overlap condition: two intervals overlap when start_a < end_b AND start_b < end_a
      .where('schedule_time_slots.start_time', '<', endTime)
      .andWhere('schedule_time_slots.end_time', '>', startTime)

    // Filter by academic year if provided
    if (academicYearId) {
      base.where('schedules.academic_year_id', academicYearId)
    }

    // Exclude the schedule being updated
    if (excludeScheduleId) {
      base.where('schedules.id', '!=', excludeScheduleId)
    }

    const details = await base.select(
      'schedules.id as schedule_id',
      'schedules.class_id',
      'schedules.teacher_id',
      'schedule_time_slots.id as slot_id',
      'schedule_time_slots.day_of_week',
      'schedule_time_slots.start_time',
      'schedule_time_slots.end_time'
    )

    const classConflict = details.some((d: any) => d.class_id === classId)
    const teacherConflict = details.some((d: any) => d.teacher_id === teacherId)

    return { classConflict, teacherConflict, details }
  }

  /** Batch create time slots */
  async createTimeSlots(scheduleId: number, slots: ScheduleTimeSlotCreateInput[]): Promise<void> {
    // Normalize to only include fields that match the table schema
    const rows = slots.map((s) => ({
      schedule_id: scheduleId,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      room: s.room ?? null,
    }))
    if (rows.length > 0) {
      await this.knex('schedule_time_slots').insert(rows)
    }
  }

  /** Delete all time slots for a schedule */
  async deleteTimeSlots(scheduleId: number): Promise<void> {
    await this.knex('schedule_time_slots').where({ schedule_id: scheduleId }).del()
  }

  /** Get schedule with full joined details */
  async getScheduleWithDetails(id: number): Promise<ScheduleWithDetails | null> {
    return (await this.knex<ScheduleWithDetails>('schedules')
      .join('classes', 'schedules.class_id', '=', 'classes.id')
      .join('school_subjects', 'schedules.school_subject_id', '=', 'school_subjects.id')
      .join('teachers', 'schedules.teacher_id', '=', 'teachers.id')
      .join('academic_years', 'schedules.academic_year_id', '=', 'academic_years.id')
      .join('schools', 'academic_years.school_id', '=', 'schools.id')
      .select(
        'schedules.*',
        'classes.name as class_name',
        'classes.grade as class_grade',
        'school_subjects.name as school_subject_name',
        'school_subjects.code as school_subject_code',
        'teachers.specialization as teacher_specialization',
        'teachers.phone as teacher_phone',
        'academic_years.year as academic_year_year',
        'academic_years.semester as academic_year_semester',
        'academic_years.start_date as academic_year_start_date',
        'academic_years.end_date as academic_year_end_date',
        'schools.name as school_name'
      )
      .where('schedules.id', id)
      .first()) ?? null
  }

  /** Get all time slots for a schedule */
  async getTimeSlots(scheduleId: number): Promise<ScheduleTimeSlot[]> {
    return await this.knex<ScheduleTimeSlot>('schedule_time_slots')
      .where({ schedule_id: scheduleId })
      .orderBy('day_of_week', 'asc')
      .orderBy('start_time', 'asc')
  }

  /** Get all time slots for a list of schedules */
  async getTimeSlotsByScheduleIds(scheduleIds: number[]): Promise<Record<number, ScheduleTimeSlot[]>> {
    if (scheduleIds.length === 0) return {}
    const rows = await this.knex<ScheduleTimeSlot>('schedule_time_slots')
      .whereIn('schedule_id', scheduleIds)
      .orderBy('schedule_id', 'asc')
      .orderBy('day_of_week', 'asc')
      .orderBy('start_time', 'asc')
    const result: Record<number, ScheduleTimeSlot[]> = {}
    for (const row of rows) {
      if (!result[row.schedule_id]) result[row.schedule_id] = []
      result[row.schedule_id].push(row)
    }
    return result
  }
}
