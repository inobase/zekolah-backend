// =====================================================
// Schedule & Schedule Time Slot Interfaces
// =====================================================

export type Semester = 'ganjil' | 'genap'
export type ScheduleStatus = 'scheduled' | 'cancelled' | 'rescheduled'
export type DayOfWeek = 'senin' | 'selasa' | 'rabu' | 'kamis' | 'jumat' | 'sabtu'

export interface Schedule {
  id: number
  class_id: number
  school_subject_id: number
  teacher_id: number
  academic_year_id: number
  semester: Semester
  status: ScheduleStatus
  room: string | null
  created_at: Date
  updated_at: Date
}

export interface ScheduleCreateInput {
  class_id: number
  school_subject_id: number
  teacher_id: number
  academic_year_id: number
  semester: Semester
  status?: ScheduleStatus
  room?: string | null
}

export interface ScheduleUpdateInput {
  class_id?: number
  school_subject_id?: number
  teacher_id?: number
  academic_year_id?: number
  semester?: Semester
  status?: ScheduleStatus
  room?: string | null
}

export interface ScheduleFilterInput {
  school_id?: number
  class_id?: number
  teacher_id?: number
  school_subject_id?: number
  academic_year_id?: number
  semester?: Semester
  status?: ScheduleStatus
}

export interface ScheduleTimeSlot {
  id: number
  schedule_id: number
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room: string | null
  created_at: Date
  updated_at: Date
}

export interface ScheduleTimeSlotCreateInput {
  schedule_id: number
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room?: string | null
}

/** Joined schedule with class, school_subject, teacher, academic_year */
export interface ScheduleWithDetails extends Schedule {
  class_name: string
  class_grade: string
  school_subject_name: string
  school_subject_code: string
  teacher_name: string
  teacher_phone: string | null
  teacher_specialization: string | null
  academic_year_year: string
  academic_year_semester: string
  academic_year_start_date: Date
  academic_year_end_date: Date
  school_name: string
}

/** Schedule conflict detection result */
export interface ScheduleConflict {
  schedule_id: number
  conflict_type: 'class' | 'teacher' | 'room'
  conflicting_schedule_id: number
  day_of_week: DayOfWeek
  overlap_start: string
  overlap_end: string
  message: string
}

/** Weekly timetable entry grouped by day */
export interface TimetableEntry {
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room: string | null
  schedule: ScheduleWithDetails
}

/** Weekly timetable grouped by day */
export interface WeeklyTimetable {
  class_name: string
  class_grade: string
  academic_year_year: string
  semester: Semester
  days: {
    senin: TimetableEntry[]
    selasa: TimetableEntry[]
    rabu: TimetableEntry[]
    kamis: TimetableEntry[]
    jumat: TimetableEntry[]
    sabtu: TimetableEntry[]
  }
}
