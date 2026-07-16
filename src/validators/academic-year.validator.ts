// =====================================================
// Academic Year Validators
// =====================================================

import { z } from 'zod'

export const CreateAcademicYearSchema = z.object({
  school_id: z.coerce.number().int().positive(),
  year: z.string().min(2).max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  semester: z.enum(['ganjil', 'genap']).default('ganjil'),
  status: z.enum(['upcoming', 'current', 'finished']).default('upcoming'),
}).strict()

export const UpdateAcademicYearSchema = z.object({
  year: z.string().min(2).max(20).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  semester: z.enum(['ganjil', 'genap']).optional(),
  status: z.enum(['upcoming', 'current', 'finished']).optional(),
}).strict()

export const AcademicYearFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  school_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['upcoming', 'current', 'finished']).optional(),
  search: z.string().max(100).optional(),
})

// Response schemas
export const AcademicYearResponseSchema = z.object({
  id: z.number(),
  school_id: z.number(),
  year: z.string(),
  start_date: z.any(),
  end_date: z.any(),
  semester: z.string(),
  status: z.string(),
  created_at: z.any(),
  updated_at: z.any(),
})

export const PaginatedAcademicYearsResponseSchema = z.object({
  data: z.array(AcademicYearResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const AcademicYearDeleteResponseSchema = z.object({
  message: z.string(),
})

export const AcademicYearIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateAcademicYearInput = z.infer<typeof CreateAcademicYearSchema>
export type UpdateAcademicYearInput = z.infer<typeof UpdateAcademicYearSchema>
export type AcademicYearFilterInput = z.infer<typeof AcademicYearFilterSchema>