// =====================================================
// Subject Validators
// =====================================================

import { z } from 'zod'

export const CreateSubjectSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(50),
  school_id: z.coerce.number().int().positive(),
}).strict()

export const UpdateSubjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  code: z.string().min(2).max(50).optional(),
}).strict()

export const SubjectFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
})

export type CreateSubjectInput = z.infer<typeof CreateSubjectSchema>
export type UpdateSubjectInput = z.infer<typeof UpdateSubjectSchema>
export type SubjectFilterInput = z.infer<typeof SubjectFilterSchema>
