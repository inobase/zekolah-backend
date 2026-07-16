// =====================================================
// Submission Validators
// =====================================================

import { z } from 'zod'

const VALID_SUBMISSION_STATUSES = ['submitted', 'graded', 'late'] as const

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
})

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>
export type UpdateSubmissionInput = z.infer<typeof UpdateSubmissionSchema>
export type SubmissionFilterInput = z.infer<typeof SubmissionFilterSchema>
