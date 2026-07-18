// =====================================================
// School Interfaces
// =====================================================

/**
 * Kemendikbud education level codes:
 * 1A: SD/MI, 1B: SDLB, 2A: SMP/MTs, 2B: SMPLB,
 * 3A: SMA/MA, 3B: SMK/MAK, 4A: SMALB,
 * 5A: MKI (Pendidikan Tinggi), 5B: MKP (PTKIN)
 */
export type EducationLevel = '1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '4A' | '5A' | '5B'

export const EDUCATION_LEVELS: Record<EducationLevel, string> = {
  '1A': 'SD/MI',
  '1B': 'SDLB',
  '2A': 'SMP/MTs',
  '2B': 'SMPLB',
  '3A': 'SMA/MA',
  '3B': 'SMK/MAK',
  '4A': 'SMALB',
  '5A': 'MKI (Pendidikan Tinggi)',
  '5B': 'MKP (PTKIN)',
}

/** Returns true if the level supports jurusan (SMK/MAK and Pendidikan Tinggi) */
export function isJurusanEligible(level: EducationLevel): boolean {
  return ['3B', '5A', '5B'].includes(level)
}

export interface School {
  id: number
  name: string
  code: string
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  education_level: EducationLevel
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
  education_level?: EducationLevel
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
  education_level?: EducationLevel
}
