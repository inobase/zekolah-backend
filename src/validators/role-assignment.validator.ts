// =====================================================
// Role Assignment Validators (Zod)
// =====================================================

import { z } from 'zod'

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
  is_active: z.string().optional().transform((val) => val === 'true'),
})

export type RoleAssignmentFilter = z.infer<typeof RoleAssignmentFilter>
