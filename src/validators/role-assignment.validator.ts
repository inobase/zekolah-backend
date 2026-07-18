// =====================================================
// Role Assignment Validators (Zod)
// =====================================================

import { z } from 'zod'

// ── Request Body Schemas ──────────────────────────────────────

export const AssignRoleInput = z.object({
  role_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive().nullable().optional().default(null),
  academic_year_id: z.coerce.number().int().positive().nullable().optional().default(null),
})

export type AssignRoleInput = z.infer<typeof AssignRoleInput>

export const AssignUserRoleBody = z.object({
  role_id: z.coerce.number().int().positive(),
  school_id: z.coerce.number().int().positive().nullable().optional().default(null),
  academic_year_id: z.coerce.number().int().positive().nullable().optional().default(null),
}).strict()

export type AssignUserRoleBody = z.infer<typeof AssignUserRoleBody>

export const UpdateRoleInput = z.object({
  is_active: z.boolean().optional(),
})

export type UpdateRoleInput = z.infer<typeof UpdateRoleInput>

export const RoleAssignmentFilter = z.object({
  is_active: z.string().optional(),
}).passthrough()

export type RoleAssignmentFilter = z.infer<typeof RoleAssignmentFilter>

// ── Param Schemas ─────────────────────────────────────────────

export const UserIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type UserIdParamSchema = z.infer<typeof UserIdParamSchema>

export const RoleIdParamSchema = z.object({
  roleId: z.coerce.number().int().positive(),
})

export type RoleIdParamSchema = z.infer<typeof RoleIdParamSchema>

// ── Response Schemas ──────────────────────────────────────────

export const UserRoleWithDetailsSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  role_id: z.number(),
  school_id: z.number().nullable(),
  academic_year_id: z.number().nullable(),
  is_active: z.boolean(),
  granted_at: z.any().nullable(),
  granted_by: z.number().nullable(),
  created_at: z.any(),
  updated_at: z.any(),
  role_name: z.string(),
  role_description: z.any().nullable().optional(),
}).passthrough()

export const RoleAssignmentResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.any()),
})

export const RoleAssignmentListResponseSchema = z.object({
  message: z.string().optional(),
  data: z.array(z.record(z.any())),
})

export const ContextItemSchema = z.object({
  user_id: z.number(),
  role: z.string(),
  role_id: z.number(),
  school_id: z.number().nullable(),
  academic_year_id: z.number().nullable(),
}).passthrough()

export const ContextListResponseSchema = z.object({
  message: z.string().optional(),
  data: z.array(ContextItemSchema),
})

export const DeleteResponseSchema = z.object({
  message: z.string(),
})
