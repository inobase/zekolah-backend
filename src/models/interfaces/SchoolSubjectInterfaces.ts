// =====================================================
// School Subject Interfaces
// =====================================================

export type SubjectType = 'UMUM' | 'DD' | 'DP' | 'SP'

export interface SchoolSubject {
  id: number
  school_id: number
  specialization_id: number
  name: string
  code: string
  subject_type: SubjectType
  jp_per_minggu: number
  jp_per_semester: number
  theory_hours: number
  practice_hours: number
  customizable: boolean
  created_at: Date
  updated_at: Date
}

export interface SchoolSubjectCreateInput {
  school_id: number
  specialization_id: number
  name: string
  code: string
  subject_type: SubjectType
  jp_per_minggu: number
  jp_per_semester: number
  theory_hours?: number
  practice_hours?: number
  customizable?: boolean
}

export interface SchoolSubjectUpdateInput {
  name?: string
  code?: string
  subject_type?: SubjectType
  jp_per_minggu?: number
  jp_per_semester?: number
  theory_hours?: number
  practice_hours?: number
  customizable?: boolean
}

export interface SchoolSubjectFilterInput {
  school_id?: number
  specialization_id?: number
  subject_type?: SubjectType
  search?: string
}
