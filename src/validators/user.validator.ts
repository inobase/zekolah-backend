// =====================================================
// User Validators
// =====================================================

import { z } from 'zod'

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
  avatar_url: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
}).strict()

export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar_url: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
}).strict()

export const UserFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  search: z.string().max(100).optional(),
})

export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UserFilterInput = z.infer<typeof UserFilterSchema>
