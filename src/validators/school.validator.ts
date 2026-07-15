// =====================================================
// School Validators
// =====================================================

import { z } from 'zod'

export const CreateSchoolSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(50),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
})

export const UpdateSchoolSchema = CreateSchoolSchema.partial()
export const SchoolFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>
export type UpdateSchoolInput = z.infer<typeof UpdateSchoolSchema>
export type SchoolFilterInput = z.infer<typeof SchoolFilterSchema>
