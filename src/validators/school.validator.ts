// =====================================================
// School Validators
// =====================================================

import { z } from 'zod'

/** Kemendikbud education level codes */
export const EDUCATION_LEVEL_ENUM = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '5B'] as const

export const EducationLevelSchema = z.enum(EDUCATION_LEVEL_ENUM).default('3B')

export const CreateSchoolSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().min(2).max(50),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  province: z.string().max(100).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  education_level: EducationLevelSchema,
})

export const UpdateSchoolSchema = CreateSchoolSchema.partial()
export const SchoolFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  education_level: EducationLevelSchema.optional(),
})

// Response schemas
export const SchoolResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  education_level: EducationLevelSchema,
  logo_url: z.string().nullable(),
  status: z.string(),
  created_at: z.any(),
  updated_at: z.any(),
})

export const PaginatedSchoolsResponseSchema = z.object({
  data: z.array(SchoolResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const SchoolDeleteResponseSchema = z.object({
  message: z.string(),
})

export const SchoolIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateSchoolInput = z.infer<typeof CreateSchoolSchema>
export type UpdateSchoolInput = z.infer<typeof UpdateSchoolSchema>
export type SchoolFilterInput = z.infer<typeof SchoolFilterSchema>
export type EducationLevel = z.infer<typeof EducationLevelSchema>
