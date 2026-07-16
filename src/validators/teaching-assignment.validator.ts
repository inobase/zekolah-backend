// =====================================================
// TeachingAssignment Validators
// =====================================================

import { z } from 'zod'

export const CreateTeachingAssignmentSchema = z.object({
  teacher_id: z.coerce.number().int().positive(),
  class_id: z.coerce.number().int().positive(),
  subject_id: z.coerce.number().int().positive(),
  academic_year_id: z.coerce.number().int().positive(),
}).strict()

export const UpdateTeachingAssignmentSchema = z.object({
  teacher_id: z.coerce.number().int().positive().optional().nullable(),
  class_id: z.coerce.number().int().positive().optional().nullable(),
  subject_id: z.coerce.number().int().positive().optional().nullable(),
  academic_year_id: z.coerce.number().int().positive().optional().nullable(),
}).strict().refine((data) => {
  const fields = [data.teacher_id, data.class_id, data.subject_id, data.academic_year_id]
  return fields.some(v => v !== undefined)
}, { message: 'At least one field must be provided' })

export const TeachingAssignmentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  teacher_id: z.coerce.number().int().positive().optional(),
  class_id: z.coerce.number().int().positive().optional(),
  subject_id: z.coerce.number().int().positive().optional(),
})

// Response schemas
export const TeachingAssignmentResponseSchema = z.object({
  id: z.number(),
  teacher_id: z.number(),
  class_id: z.number(),
  subject_id: z.number(),
  academic_year_id: z.number(),
  created_at: z.any(),
  updated_at: z.any(),
})

export const PaginatedTeachingAssignmentsResponseSchema = z.object({
  data: z.array(TeachingAssignmentResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const TeachingAssignmentDeleteResponseSchema = z.object({
  message: z.string(),
})

export const TeachingAssignmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateTeachingAssignmentInput = z.infer<typeof CreateTeachingAssignmentSchema>
export type UpdateTeachingAssignmentInput = z.infer<typeof UpdateTeachingAssignmentSchema>
export type TeachingAssignmentFilterInput = z.infer<typeof TeachingAssignmentFilterSchema>
export type TeachingAssignmentResponse = z.infer<typeof TeachingAssignmentResponseSchema>
