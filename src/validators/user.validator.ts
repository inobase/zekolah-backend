// =====================================================
// User Validators
// =====================================================

import { z } from 'zod'

// Input schemas
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

// Response schemas
export const UserResponseSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  phone: z.string().nullable(),
  avatar_url: z.string().nullable(),
  address: z.string().nullable(),
  last_login: z.any().nullable(),
  email_verified_at: z.any().nullable(),
  created_at: z.any(),
  updated_at: z.any(),
})

export const PaginatedUsersResponseSchema = z.object({
  data: z.array(UserResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
})

export const UserDeleteResponseSchema = z.object({
  message: z.string(),
})

export const UserIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// Types
export type CreateUserInput = z.infer<typeof CreateUserSchema>
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
export type UserFilterInput = z.infer<typeof UserFilterSchema>
export type UserResponse = z.infer<typeof UserResponseSchema>
