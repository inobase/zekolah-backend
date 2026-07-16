// =====================================================
// Assignment Validators
// =====================================================

import { z } from 'zod'

export const CreateAssignmentSchema = z.object({
  teacher_id: z.coerce.number().int().positive(),
  class_id: z.coerce.number().int().positive(),
  subject_id: z.coerce.number().int().positive(),
  academic_year_id: z.coerce.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  due_date: z.union([z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }), z.date()]),
  max_score: z.coerce.number().int().min(0).default(100),
  attachments: z.any().optional().nullable(),
}).strict()

export const UpdateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  due_date: z.union([z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }), z.date()]).optional().nullable(),
  max_score: z.coerce.number().int().min(0).optional().nullable(),
  attachments: z.any().optional().nullable(),
}).strict()

export const AssignmentFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  class_id: z.coerce.number().int().positive().optional(),
  subject_id: z.coerce.number().int().positive().optional(),
  teacher_id: z.coerce.number().int().positive().optional(),
})

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentSchema>
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>
export type AssignmentFilterInput = z.infer<typeof AssignmentFilterSchema>
