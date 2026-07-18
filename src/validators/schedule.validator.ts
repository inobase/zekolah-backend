// =====================================================
// Schedule Validators — Schemas for schedules & time slots
// =====================================================

import { z } from 'zod'

// ==================== SCHEDULE TIME SLOT ====================

export const ScheduleTimeSlotSchema = z.object({
  day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (HH:MM or HH:MM:SS)'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (HH:MM or HH:MM:SS)'),
  room: z.string().max(50).optional().nullable(),
}).refine(
  (data) => data.start_time < data.end_time,
  { message: 'start_time must be before end_time', path: ['end_time'] }
)

export type ScheduleTimeSlotInput = z.infer<typeof ScheduleTimeSlotSchema>

// ==================== SCHEDULE CREATE ====================

export const ScheduleCreateSchema = z.object({
  class_id: z.number().int().positive(),
  school_subject_id: z.number().int().positive(),
  teacher_id: z.number().int().positive(),
  academic_year_id: z.number().int().positive(),
  semester: z.enum(['ganjil', 'genap']),
  status: z.enum(['scheduled', 'cancelled', 'rescheduled']).default('scheduled').optional(),
  room: z.string().max(50).optional().nullable(),
  time_slots: z.array(ScheduleTimeSlotSchema).min(1, 'At least one time slot is required'),
})

export type ScheduleCreateInputValidated = z.infer<typeof ScheduleCreateSchema>

// ==================== SCHEDULE UPDATE ====================

export const ScheduleUpdateSchema = z.object({
  class_id: z.number().int().positive().optional(),
  school_subject_id: z.number().int().positive().optional(),
  teacher_id: z.number().int().positive().optional(),
  academic_year_id: z.number().int().positive().optional(),
  semester: z.enum(['ganjil', 'genap']).optional(),
  status: z.enum(['scheduled', 'cancelled', 'rescheduled']).optional(),
  room: z.string().max(50).optional().nullable(),
  time_slots: z.array(ScheduleTimeSlotSchema).min(1).optional(),
})

export type ScheduleUpdateInputValidated = z.infer<typeof ScheduleUpdateSchema>

// ==================== SCHEDULE FILTER ====================

export const ScheduleFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  class_id: z.coerce.number().int().positive().optional(),
  teacher_id: z.coerce.number().int().positive().optional(),
  school_subject_id: z.coerce.number().int().positive().optional(),
  academic_year_id: z.coerce.number().int().positive().optional(),
  semester: z.enum(['ganjil', 'genap']).optional(),
  status: z.enum(['scheduled', 'cancelled', 'rescheduled']).optional(),
})

export type ScheduleFilter = z.infer<typeof ScheduleFilterSchema>

// ==================== PATH/QUERY PARAMS ====================

export const ScheduleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const ScheduleClassPathParamSchema = z.object({
  classId: z.coerce.number().int().positive(),
})

export const ScheduleTeacherPathParamSchema = z.object({
  teacherId: z.coerce.number().int().positive(),
})

// ==================== RESPONSE SCHEMAS ====================

const ScheduleBaseSchema = z.object({
  id: z.number(),
  class_id: z.number(),
  school_subject_id: z.number(),
  teacher_id: z.number(),
  academic_year_id: z.number(),
  semester: z.enum(['ganjil', 'genap']),
  status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
  room: z.string().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})

export const ScheduleResponseSchema = ScheduleBaseSchema

export const ScheduleListResponseSchema = z.object({
  data: z.array(ScheduleBaseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const TimetableEntrySchema = z.object({
  day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string().nullable(),
  schedule: z.object({
    id: z.number(),
    class_id: z.number(),
    school_subject_id: z.number(),
    teacher_id: z.number(),
    academic_year_id: z.number(),
    semester: z.enum(['ganjil', 'genap']),
    status: z.enum(['scheduled', 'cancelled', 'rescheduled']),
    room: z.string().nullable(),
    class_name: z.string(),
    class_grade: z.string(),
    school_subject_name: z.string(),
    school_subject_code: z.string(),
    teacher_name: z.string().optional(),
    teacher_phone: z.string().nullable().optional(),
    teacher_specialization: z.string().nullable().optional(),
    academic_year_year: z.string(),
    academic_year_semester: z.string(),
    academic_year_start_date: z.union([z.string(), z.date()]),
    academic_year_end_date: z.union([z.string(), z.date()]),
    school_name: z.string(),
    created_at: z.union([z.string(), z.date()]),
    updated_at: z.union([z.string(), z.date()]),
  }),
})

export const TimetableResponseSchema = z.object({
  class_name: z.string(),
  class_grade: z.string(),
  academic_year_year: z.string(),
  semester: z.enum(['ganjil', 'genap']),
  days: z.object({
    senin: z.array(TimetableEntrySchema),
    selasa: z.array(TimetableEntrySchema),
    rabu: z.array(TimetableEntrySchema),
    kamis: z.array(TimetableEntrySchema),
    jumat: z.array(TimetableEntrySchema),
    sabtu: z.array(TimetableEntrySchema),
  }),
})

export const ScheduleConflictSchema = z.object({
  schedule_id: z.number(),
  conflict_type: z.enum(['class', 'teacher', 'room']),
  conflicting_schedule_id: z.number(),
  day_of_week: z.enum(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']),
  overlap_start: z.string(),
  overlap_end: z.string(),
  message: z.string(),
})

export const ScheduleConflictsResponseSchema = z.object({
  data: z.array(ScheduleConflictSchema),
})