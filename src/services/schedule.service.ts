// =====================================================
// Schedule Service — Business logic for schedules & time slots
// =====================================================

import { Knex } from 'knex'
import { ScheduleRepository } from '../repositories/schedule.repository'
import {
  Schedule,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  ScheduleFilterInput,
  ScheduleWithDetails,
  ScheduleConflict,
  WeeklyTimetable,
  TimetableEntry,
  DayOfWeek,
  Semester,
} from '../models/interfaces/ScheduleInterfaces'
import { AppError } from '../utils/AppError'

const VALID_DAYS: DayOfWeek[] = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
const VALID_SEMESTERS: Semester[] = ['ganjil', 'genap']
const VALID_STATUSES: Schedule['status'][] = ['scheduled', 'cancelled', 'rescheduled']

export class ScheduleService {
  private repo: ScheduleRepository

  constructor(private knex: Knex) {
    this.repo = new ScheduleRepository(knex)
  }

  // ---------- list ----------

  async list(filter: Partial<ScheduleFilterInput & { page?: number; limit?: number }>) {
    const page = filter.page ?? 1
    const limit = filter.limit ?? 50
    const offset = (page - 1) * limit
    
    // Build filter predicate without page/limit
    const whereFilter: ScheduleFilterInput = {} as any
    if (filter.class_id) whereFilter.class_id = filter.class_id
    if (filter.teacher_id) whereFilter.teacher_id = filter.teacher_id
    if (filter.school_subject_id) whereFilter.school_subject_id = filter.school_subject_id
    if (filter.academic_year_id) whereFilter.academic_year_id = filter.academic_year_id
    if (filter.semester) whereFilter.semester = filter.semester
    if (filter.status) whereFilter.status = filter.status
    
    const [data, countRow] = await Promise.all([
      this.repo.findAll({ ...whereFilter, limit, offset }),
      this.knex<Schedule>('schedules')
        .count('* as count')
        .where(whereFilter as any)
        .first(),
    ])
    const total = Number((countRow as any)?.count ?? 0)
    return { data, pagination: { page, limit, total } }
  }

  // ---------- get by id ----------

  async getById(id: number): Promise<ScheduleWithDetails> {
    const schedule = await this.repo.getScheduleWithDetails(id)
    if (!schedule) throw new AppError('NOT_FOUND', 'Schedule not found')
    return schedule
  }

  // ---------- create ----------

  async create(data: ScheduleCreateInput & { time_slots: { day_of_week: DayOfWeek; start_time: string; end_time: string; room?: string | null }[] }): Promise<ScheduleWithDetails> {
    // Validate
    this.validateScheduleInput(data)

    // Check time_slots
    if (!data.time_slots || data.time_slots.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'At least one time slot is required')
    }

    const { time_slots, ...scheduleData } = data

    // Check for conflicts using a transaction
    let scheduleId: number | undefined = undefined
    
    try {
      await this.knex.transaction(async (trx) => {
        // Check each slot individually
        for (const slot of time_slots) {
          const result = await this.repo.checkConflict(
            scheduleData.class_id,
            scheduleData.teacher_id,
            slot.day_of_week,
            slot.start_time,
            slot.end_time,
            scheduleData.academic_year_id
          )

          if (result.classConflict) {
            throw new AppError('SCHEDULE_CONFLICT', 'Class already has a schedule conflict on this day/time')
          }
          if (result.teacherConflict) {
            throw new AppError('SCHEDULE_CONFLICT', 'Teacher already has a schedule conflict on this day/time')
          }
        }

        // Insert schedule
        const [id] = await trx('schedules').insert(scheduleData)
        scheduleId = id as number

        // Insert time slots
        const slotsInsert = time_slots.map((s) => ({
          schedule_id: id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          room: s.room ?? null,
        }))
        await trx('schedule_time_slots').insert(slotsInsert)
      })
    } catch (err: any) {
      if (err instanceof AppError) throw err
      throw new AppError('SCHEDULE_CONFLICT', err?.message ?? 'Failed to create schedule')
    }

    if (scheduleId === undefined) {
      throw new AppError('INTERNAL_ERROR', 'Schedule ID was not generated')
    }
    return this.getById(scheduleId)
  }

  // ---------- update ----------

  async update(id: number, data: Partial<ScheduleUpdateInput>): Promise<ScheduleWithDetails> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Schedule not found')

    if (data.semester && !VALID_SEMESTERS.includes(data.semester)) {
      throw new AppError('VALIDATION_ERROR', `Invalid semester. Must be one of: ${VALID_SEMESTERS.join(', ')}`)
    }
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new AppError('VALIDATION_ERROR', `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    const updatedFields = { ...existing, ...data }
    this.validateScheduleInput(updatedFields as ScheduleCreateInput)

    let scheduleId: number | undefined = undefined
    try {
      await this.knex.transaction(async (trx) => {
        // Re-validate conflicts if schedule-defining fields changed
        const slots = await this.repo.getTimeSlots(id)
        const hasTimeSlots = slots.length > 0

        if (hasTimeSlots && (data.teacher_id || data.class_id || data.academic_year_id)) {
          for (const slot of slots) {
            const result = await this.repo.checkConflict(
              data.class_id ?? existing.class_id,
              data.teacher_id ?? existing.teacher_id,
              slot.day_of_week,
              slot.start_time,
              slot.end_time,
              data.academic_year_id ?? existing.academic_year_id,
              id
            )
            if (result.classConflict) {
              throw new AppError('SCHEDULE_CONFLICT', 'Class already has a schedule conflict on this day/time')
            }
            if (result.teacherConflict) {
              throw new AppError('SCHEDULE_CONFLICT', 'Teacher already has a schedule conflict on this day/time')
            }
          }
        }

        await trx('schedules').where({ id }).update(data)
        scheduleId = id
      })
    } catch (err: any) {
      if (err instanceof AppError) throw err
      throw new AppError('SCHEDULE_CONFLICT', err?.message ?? 'Failed to update schedule')
    }

    if (scheduleId === undefined) {
      throw new AppError('INTERNAL_ERROR', 'Schedule update failed')
    }
    return this.getById(scheduleId)
  }

  // ---------- delete ----------

  async delete(id: number): Promise<void> {
    const existing = await this.repo.findById(id)
    if (!existing) throw new AppError('NOT_FOUND', 'Schedule not found')
    await this.repo.deleteTimeSlots(id)
    await this.repo.delete(id)
  }

  // ---------- findByClass ----------

  async findByClass(classId: number, academicYearId: number, semester: Semester): Promise<Schedule[]> {
    return this.repo.findByClass(classId, academicYearId, semester)
  }

  // ---------- findByTeacher ----------

  async findByTeacher(teacherId: number, academicYearId: number, semester: Semester): Promise<Schedule[]> {
    return this.repo.findByTeacher(teacherId, academicYearId, semester)
  }

  // ---------- weekly timetable for a class ----------

  async getWeeklyTimetable(classId: number, academicYearId: number, semester: Semester): Promise<WeeklyTimetable> {
    const schedules = await this.repo.findByClass(classId, academicYearId, semester)
    if (schedules.length === 0) {
      // Return empty timetable structure
      return this.emptyTimetable()
    }

    const scheduleDetails = await Promise.all(schedules.map((s) => this.repo.getScheduleWithDetails(s.id)))
    const slotMap = await this.repo.getTimeSlotsByScheduleIds(schedules.map((s) => s.id))

    // Build entries
    const dayEntries: Record<DayOfWeek, TimetableEntry[]> = {
      senin: [],
      selasa: [],
      rabu: [],
      kamis: [],
      jumat: [],
      sabtu: [],
    }

    for (const detail of scheduleDetails) {
      if (!detail) continue
      const slots = slotMap[detail.id] ?? []
      for (const slot of slots) {
        const entry: TimetableEntry = {
          day_of_week: slot.day_of_week as DayOfWeek,
          start_time: slot.start_time,
          end_time: slot.end_time,
          room: slot.room ?? detail.room,
          schedule: detail,
        }
        dayEntries[slot.day_of_week as DayOfWeek]?.push(entry)
      }
    }

    // Sort each day by start_time
    const dayOrder: DayOfWeek[] = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
    const firstClass = schedules.length > 0 ? await this.repo.getScheduleWithDetails(schedules[0].id) : null
    for (const day of dayOrder) {
      dayEntries[day].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }

    return {
      class_name: firstClass?.class_name ?? '',
      class_grade: firstClass?.class_grade ?? '',
      academic_year_year: firstClass?.academic_year_year ?? '',
      semester,
      days: dayEntries,
    }
  }

  // ---------- weekly timetable for a teacher ----------

  async getTeacherWeeklyTimetable(teacherId: number, academicYearId: number, semester: Semester): Promise<WeeklyTimetable> {
    const schedules = await this.repo.findByTeacher(teacherId, academicYearId, semester)
    if (schedules.length === 0) {
      return this.emptyTimetable()
    }

    const scheduleDetails = await Promise.all(schedules.map((s) => this.repo.getScheduleWithDetails(s.id)))
    const slotMap = await this.repo.getTimeSlotsByScheduleIds(schedules.map((s) => s.id))

    const dayEntries: Record<DayOfWeek, TimetableEntry[]> = {
      senin: [],
      selasa: [],
      rabu: [],
      kamis: [],
      jumat: [],
      sabtu: [],
    }

    for (const detail of scheduleDetails) {
      if (!detail) continue
      const slots = slotMap[detail.id] ?? []
      for (const slot of slots) {
        const entry: TimetableEntry = {
          day_of_week: slot.day_of_week as DayOfWeek,
          start_time: slot.start_time,
          end_time: slot.end_time,
          room: slot.room ?? detail.room,
          schedule: detail,
        }
        dayEntries[slot.day_of_week as DayOfWeek]?.push(entry)
      }
    }

    const dayOrder: DayOfWeek[] = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
    const firstDetail = scheduleDetails.find(Boolean)
    for (const day of dayOrder) {
      dayEntries[day].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }

    return {
      class_name: firstDetail?.class_name ?? '',
      class_grade: firstDetail?.class_grade ?? '',
      academic_year_year: firstDetail?.academic_year_year ?? '',
      semester,
      days: dayEntries,
    }
  }

  // ---------- detect conflicts ----------

  async detectConflicts(filter: Partial<ScheduleFilterInput>): Promise<ScheduleConflict[]> {
    const schedules = await this.repo.findAll(filter as any)
    const conflicts: ScheduleConflict[] = []

    for (const sched of schedules) {
      if (sched.status === 'cancelled') continue
      const slots = await this.repo.getTimeSlots(sched.id)
      if (slots.length === 0) continue

      // Check class conflicts
      const result = await this.repo.checkConflict(
        sched.class_id,
        sched.teacher_id,
        'senin' as DayOfWeek,
        '00:00:00',
        '23:59:59',
        sched.academic_year_id
      )

      for (const slot of slots) {
        const slotResult = await this.repo.checkConflict(
          sched.class_id,
          sched.teacher_id,
          slot.day_of_week as DayOfWeek,
          slot.start_time,
          slot.end_time,
          sched.academic_year_id,
          sched.id
        )

        for (const detail of slotResult.details) {
          conflicts.push({
            schedule_id: sched.id,
            conflict_type: detail.class_id === sched.class_id ? 'class' : 'teacher',
            conflicting_schedule_id: detail.schedule_id,
            day_of_week: slot.day_of_week,
            overlap_start: Math.max(new Date(`1970-01-01T${slot.start_time}`).getTime(), new Date(`1970-01-01T${detail.start_time}`).getTime()) > 0
              ? slot.start_time
              : detail.start_time,
            overlap_end: Math.min(new Date(`1970-01-01T${slot.end_time}`).getTime(), new Date(`1970-01-01T${detail.end_time}`).getTime()) > 0
              ? slot.end_time
              : detail.end_time,
            message:
              detail.class_id === sched.class_id
                ? `Class ${sched.class_id} has overlapping schedule with schedule ${detail.schedule_id}`
                : `Teacher ${sched.teacher_id} has overlapping schedule with schedule ${detail.schedule_id}`,
          })
        }
      }
    }

    return conflicts
  }

  // ---------- helpers ----------

  private validateScheduleInput(data: ScheduleCreateInput): void {
    if (!VALID_SEMESTERS.includes(data.semester)) {
      throw new AppError('VALIDATION_ERROR', `Invalid semester. Must be one of: ${VALID_SEMESTERS.join(', ')}`)
    }
    if (data.status && !VALID_STATUSES.includes(data.status)) {
      throw new AppError('VALIDATION_ERROR', `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
    }
  }

  private emptyTimetable(): WeeklyTimetable {
    return {
      class_name: '',
      class_grade: '',
      academic_year_year: '',
      semester: 'ganjil',
      days: {
        senin: [],
        selasa: [],
        rabu: [],
        kamis: [],
        jumat: [],
        sabtu: [],
      },
    }
  }
}
