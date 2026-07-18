// =====================================================
// Program Interfaces
// =====================================================

/** Kemendikbud education level codes that support jurusan (SMK/MAK/PT) */
export type JurusanEducationLevel = '3B' | '5A' | '5B'

export interface Program {
  id: number
  code: string
  name: string
  description?: string | null
  education_level: JurusanEducationLevel
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface ProgramCreateInput {
  code: string
  name: string
  description?: string | null
  education_level: JurusanEducationLevel
  is_active?: boolean
}

export interface ProgramUpdateInput {
  code?: string
  name?: string
  description?: string | null
  education_level?: JurusanEducationLevel
  is_active?: boolean
}

export interface ProgramFilterInput {
  education_level?: JurusanEducationLevel
  is_active?: boolean
  search?: string
}

// ===================== SPECIALIZATION =====================

export interface Specialization {
  id: number
  program_id: number
  code: string
  name: string
  description?: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SpecializationCreateInput {
  program_id: number
  code: string
  name: string
  description?: string | null
  is_active?: boolean
}

export interface SpecializationUpdateInput {
  code?: string
  name?: string
  description?: string | null
  is_active?: boolean
}

export interface SpecializationFilterInput {
  program_id?: number
  is_active?: boolean
  search?: string
}
