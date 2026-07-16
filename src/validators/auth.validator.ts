// =====================================================
// Auth Validators — Zod schemas for register, login, refresh
// =====================================================

import { z } from 'zod'

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(100),
})

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1),
})

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RefreshInput = z.infer<typeof RefreshSchema>
