// =====================================================
// Auth Interfaces
// =====================================================

export interface AuthUser {
  id: number
  email: string
  name: string
  status: string
  phone?: string | null
  avatar_url?: string | null
  address?: string | null
  last_login?: Date | null
  email_verified_at?: Date | null
  created_at: Date
  updated_at: Date
}

export interface SafeUser {
  id: number
  email: string
  name: string
  status: string
  phone?: string | null
  avatar_url?: string | null
  address?: string | null
  last_login?: Date | null
  email_verified_at?: Date | null
  created_at: Date
  updated_at: Date
}

export interface AuthTokenResponse {
  user: SafeUser
  token: string
}

export interface RefreshToken {
  id: number
  user_id: number
  token: string
  expires_at: Date
  revoked_reason?: string | null
  revoked_at?: Date | null
  created_at: Date
  updated_at: Date
}
