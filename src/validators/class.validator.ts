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

// Response schemas
export const ClassResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  grade: z.string(),
  school_id: z.number(),
  academic_year_id: z.number(),
  class_advisor_id: z.number().nullable(),
  created_at: z.any(),
  updated_at: z.any(),
})

export const PaginatedClassesResponseSchema = z.object({
  data: z.array(ClassResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const ClassDeleteResponseSchema = z.object({
  message: z.string(),
})

export const ClassIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateClassInput = z.infer<typeof CreateClassSchema>
export type UpdateClassInput = z.infer<typeof UpdateClassSchema>
export type ClassFilterInput = z.infer<typeof ClassFilterSchema>