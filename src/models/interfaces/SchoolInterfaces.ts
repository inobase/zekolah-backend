// =====================================================
// School Interfaces
// =====================================================

export interface School {
  id: number
  name: string
  code: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  logo_url?: string | null
  status: string
  created_at: Date
  updated_at: Date
}

export interface CreateSchoolInput {
  name: string
  code: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  logo_url?: string | null
}

export interface UpdateSchoolInput {
  name?: string | null
  code?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  logo_url?: string | null
  status?: string | null
}
