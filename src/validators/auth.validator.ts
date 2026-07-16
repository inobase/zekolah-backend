// =====================================================
// Auth Validators — Zod schemas for register, login, refresh
// =====================================================

import { z } from 'zod'

// Input schemas
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

// Response schemas
export const SafeUserSchema = z.object({
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

export const AuthTokenResponseSchema = z.object({
  user: SafeUserSchema,
  token: z.string(),
})

export const LogoutResponseSchema = z.object({
  message: z.string(),
})

// Types
export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RefreshInput = z.infer<typeof RefreshSchema>
export type SafeUser = z.infer<typeof SafeUserSchema>
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>
