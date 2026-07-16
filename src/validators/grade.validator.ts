// =====================================================
// Grade Validators
// =====================================================

import { z } from 'zod'

const VALID_ASSESSMENT_TYPES = ['daily', 'midterm', 'final', 'project', 'quiz', 'exam'] as const

export const CreateGradeSchema = z.object({
  student_id: z.coerce.number().int().positive(),
  subject_id: z.coerce.number().int().positive(),
  academic_year_id: z.coerce.number().int().positive(),
  assessment_type: z.enum(VALID_ASSESSMENT_TYPES),
  score: z.coerce.number().min(0),
  max_score: z.coerce.number().min(0).default(100),
  teacher_id: z.coerce.number().int().positive().optional().nullable(),
}).strict()

export const UpdateGradeSchema = z.object({
  score: z.coerce.number().min(0).optional().nullable(),
  max_score: z.coerce.number().min(0).optional().nullable(),
  assessment_type: z.enum(VALID_ASSESSMENT_TYPES).optional().nullable(),
}).strict()

export const GradeFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  student_id: z.coerce.number().int().positive().optional(),
  subject_id: z.coerce.number().int().positive().optional(),
  assessment_type: z.enum(VALID_ASSESSMENT_TYPES).optional(),
})

// Response schemas
export const GradeResponseSchema = z.object({
  id: z.number(),
  student_id: z.number(),
  subject_id: z.number(),
  academic_year_id: z.number(),
  assessment_type: z.enum(VALID_ASSESSMENT_TYPES),
  score: z.number(),
  max_score: z.number(),
  teacher_id: z.number().nullable(),
  created_at: z.any(),
  updated_at: z.any(),
})

export const PaginatedGradesResponseSchema = z.object({
  data: z.array(GradeResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const GradeDeleteResponseSchema = z.object({
  message: z.string(),
})

export const GradeIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateGradeInput = z.infer<typeof CreateGradeSchema>
export type UpdateGradeInput = z.infer<typeof UpdateGradeSchema>
export type GradeFilterInput = z.infer<typeof GradeFilterSchema>
export type GradeResponse = z.infer<typeof GradeResponseSchema>
