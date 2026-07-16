// =====================================================
// Attendance Validators
// =====================================================

import { z } from 'zod'

const VALID_STATUSES = ['present', 'absent', 'sick', 'permission'] as const

export const CreateAttendanceSchema = z.object({
  student_id: z.coerce.number().int().positive(),
  subject_id: z.coerce.number().int().positive(),
  date: z.string().datetime({ offset: true }).or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })),
  status: z.enum(VALID_STATUSES),
}).strict()

export const UpdateAttendanceSchema = z.object({
  student_id: z.coerce.number().int().positive().optional().nullable(),
  subject_id: z.coerce.number().int().positive().optional().nullable(),
  date: z.string().datetime({ offset: true }).or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })).optional().nullable(),
  status: z.enum(VALID_STATUSES).optional().nullable(),
}).strict()

export const AttendanceFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  student_id: z.coerce.number().int().positive().optional(),
  subject_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
})

export type CreateAttendanceInput = z.infer<typeof CreateAttendanceSchema>
export type UpdateAttendanceInput = z.infer<typeof UpdateAttendanceSchema>
export type AttendanceFilterInput = z.infer<typeof AttendanceFilterSchema>
