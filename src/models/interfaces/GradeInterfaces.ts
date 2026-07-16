// =====================================================
// Grade Interfaces
// =====================================================

export interface Grade {
  id: number
  student_id: number
  subject_id: number
  academic_year_id: number
  assessment_type: string | null
  score: number | null
  max_score: number | null
  teacher_id?: number | null
  created_at: Date
  updated_at: Date
}

export interface GradeWithDetails extends Grade {
  subject_name: string
  subject_code: string
  student_name: string
  nis: string
}

export interface CreateGradeInput {
  student_id: number
  subject_id: number
  academic_year_id: number
  assessment_type: string
  score: number
  max_score: number
  teacher_id?: number | null
}

export interface UpdateGradeInput {
  score?: number | null
  max_score?: number | null
  assessment_type?: string | null
}
