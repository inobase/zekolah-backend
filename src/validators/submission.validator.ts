// =====================================================
// Submission Validators
// =====================================================

import { z } from 'zod'

const VALID_SUBMISSION_STATUSES = ['pending', 'submitted', 'graded', 'late'] as const

export const CreateSubmissionSchema = z.object({
  assignment_id: z.coerce.number().int().positive(),
  student_id: z.coerce.number().int().positive(),
  attachments: z.any().optional().nullable(),
  comments: z.string().optional().nullable(),
  status: z.enum(VALID_SUBMISSION_STATUSES).default('submitted'),
}).strict()

export const UpdateSubmissionSchema = z.object({
  score: z.coerce.number().int().min(0).optional().nullable(),
  max_score: z.coerce.number().int().min(0).optional().nullable(),
  comments: z.string().optional().nullable(),
  status: z.enum(VALID_SUBMISSION_STATUSES).optional().nullable(),
  graded_at: z.union([z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }), z.date()]).optional().nullable(),
}).strict()

export const SubmissionFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  assignment_id: z.coerce.number().int().positive().optional(),
  student_id: z.coerce.number().int().positive().optional(),
  school_id: z.coerce.number().int().positive().optional(),
})

// Response schemas
export const SubmissionResponseSchema = z.object({
  id: z.number(),
  assignment_id: z.number(),
  student_id: z.number(),
  submitted_at: z.any().nullable(),
  graded_at: z.any().nullable(),
  score: z.number().nullable(),
  max_score: z.number().nullable().optional(),
  comments: z.string().nullable(),
  status: z.enum(VALID_SUBMISSION_STATUSES),
  attachments: z.any().nullable(),
  created_at: z.any(),
  updated_at: z.any(),
  assignment_title: z.string().nullable().optional(),
  student_name: z.string().nullable().optional(),
  nis: z.string().nullable().optional(),
})

export const PaginatedSubmissionsResponseSchema = z.object({
  data: z.array(SubmissionResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const SubmissionDeleteResponseSchema = z.object({
  message: z.string(),
})

export const SubmissionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionSchema>
export type SubmissionFilterInput = z.infer<typeof SubmissionFilterSchema>
export type SubmissionResponse = z.infer<typeof SubmissionResponseSchema>
