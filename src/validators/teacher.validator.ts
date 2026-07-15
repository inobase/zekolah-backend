// =====================================================
// Teacher Validators
// =====================================================

import { z } from 'zod'

export const CreateTeacherSchema = z.object({
  user_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive(),
  nip: z.string().max(100).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
}).strict()

export const UpdateTeacherSchema = z.object({
  nip: z.string().max(100).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
}).strict()

export const TeacherFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  school_id: z.coerce.number().int().positive().optional(),
  search: z.string().max(100).optional(),
})

export type CreateTeacherInput = z.infer<typeof CreateTeacherSchema>
export type UpdateTeacherInput = z.infer<typeof UpdateTeacherSchema>
export type TeacherFilterInput = z.infer<typeof TeacherFilterSchema>