// =====================================================
// Class Validators
// =====================================================

import { z } from 'zod'

export const CreateClassSchema = z.object({
  school_id: z.coerce.number().int().positive(),
  academic_year_id: z.coerce.number().int().positive(),
  name: z.string().min(1).max(100),
  grade: z.string().min(1).max(20),
  class_advisor_id: z.coerce.number().int().positive().optional().nullable(),
}).strict()

export const UpdateClassSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  grade: z.string().min(1).max(20).optional(),
  class_advisor_id: z.coerce.number().int().positive().optional().nullable(),
}).strict()

export const ClassFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  school_id: z.coerce.number().int().positive().optional(),
  academic_year_id: z.coerce.number().int().positive().optional(),
  grade: z.string().max(20).optional(),
})

export type CreateClassInput = z.infer<typeof CreateClassSchema>
export type UpdateClassInput = z.infer<typeof UpdateClassSchema>
export type ClassFilterInput = z.infer<typeof ClassFilterSchema>