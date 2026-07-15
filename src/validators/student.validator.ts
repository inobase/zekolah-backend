// =====================================================
// Student Validators
// =====================================================

import { z } from 'zod'

export const CreateStudentSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive(),
  nis: z.string().min(3).max(50),
  nisn: z.string().max(50).optional().nullable(),
  class_id: z.coerce.number().int().positive().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
}).strict()

export const UpdateStudentSchema = z.object({
  nis: z.string().min(3).max(50).optional(),
  nisn: z.string().max(50).optional().nullable(),
  class_id: z.coerce.number().int().positive().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
}).strict()

export const StudentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  school_id: z.coerce.number().int().positive().optional(),
  class_id: z.coerce.number().int().positive().optional(),
  search: z.string().max(100).optional(),
})

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>
export type StudentFilterInput = z.infer<typeof StudentFilterSchema>