// =====================================================
// TeachingAssignment Interfaces
// =====================================================

export interface TeachingAssignment {
  id: number
  teacher_id: number
  class_id: number
  subject_id: number
  academic_year_id: number
  created_at: Date
  updated_at: Date
}

export interface TeachingAssignmentWithDetails extends TeachingAssignment {
  teacher_name: string
  specialization?: string | null
  class_name: string
  grade: string
  subject_name: string
  subject_code: string
  academic_year_label: string
}

export interface CreateTeachingAssignmentInput {
  teacher_id: number
  class_id: number
  subject_id: number
  academic_year_id: number
}

export interface UpdateTeachingAssignmentInput {
  teacher_id?: number | null
  class_id?: number | null
  subject_id?: number | null
  academic_year_id?: number | null
}
