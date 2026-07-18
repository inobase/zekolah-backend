// =====================================================
// Program Validators — Jurusan (SMK/MAK/PT)
// Schemas for programs, specializations, and school programs
// =====================================================

import { z } from 'zod'
import { EducationLevel } from '../models/interfaces/SchoolInterfaces'

const JURUSAN_LEVELS = ['3B', '5A', '5B'] as const

// ==================== PROGRAMS ====================

export const ProgramCreateSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().nullish(),
    education_level: z.string() as z.ZodType<EducationLevel>,
    is_active: z.boolean().default(true).optional(),
  }),
}).transform((data) => {
  const edu = data.body.education_level as EducationLevel
  if (!JURUSAN_LEVELS.includes(edu as any)) {
    throw new z.ZodError([{ path: ['education_level'], message: 'Program education_level must be 3B (SMK), 5A (PT), or 5B (PTKIN)', code: z.ZodIssueCode.custom }])
  }
  return {
    code: data.body.code,
    name: data.body.name,
    description: data.body.description,
    education_level: edu,
    is_active: data.body.is_active ?? true,
  }
})

export const ProgramUpdateSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().nullish(),
    education_level: z.string() as z.ZodType<EducationLevel | undefined>,
    is_active: z.boolean().optional(),
  }),
}).transform((data) => {
  if (data.body.education_level) {
    const edu = data.body.education_level as EducationLevel
    if (!JURUSAN_LEVELS.includes(edu as any)) {
      throw new z.ZodError([{ path: ['education_level'], message: 'Program education_level must be 3B (SMK), 5A (PT), or 5B (PTKIN)', code: z.ZodIssueCode.custom }])
    }
    return { ...data.body, education_level: edu }
  }
  return data.body
})

export const ProgramIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
})

export const ProgramFilterSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(50),
    search: z.string().optional().default(''),
    education_level: z.string() as z.ZodType<EducationLevel | undefined>,
    is_active: z.coerce.boolean().optional(),
  }),
})

export const ProgramResponseSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  education_level: z.string() as z.ZodType<EducationLevel>,
  is_active: z.coerce.boolean(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})

export const PaginatedProgramsResponseSchema = z.object({
  data: z.array(ProgramResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

// ==================== SPECIALIZATIONS ====================

export const SpecializationCreateSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().nullish(),
    is_active: z.boolean().default(true).optional(),
  }),
}).transform((data) => ({
  code: data.body.code,
  name: data.body.name,
  description: data.body.description,
  is_active: data.body.is_active ?? true,
}))

export const SpecializationUpdateSchema = z.object({
  body: z.object({
    code: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().nullish(),
    is_active: z.boolean().optional(),
  }),
}).transform((data) => data.body)

export const SpecializationResponseSchema = z.object({
  id: z.number(),
  program_id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  is_active: z.coerce.boolean(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
})

export const PaginatedSpecializationsResponseSchema = z.object({
  data: z.array(SpecializationResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const ProgramParamSchema = z.object({
  params: z.object({
    programId: z.string().regex(/^\d+$/).transform(Number),
  }),
})

export const SpecializationParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number),
  }),
})
