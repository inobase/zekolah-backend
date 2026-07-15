// =====================================================
// Class Interfaces
// =====================================================

export interface Class {
  id: number
  name: string
  grade: string
  school_id: number
  academic_year_id: number
  class_advisor_id?: number | null
  created_at: Date
  updated_at: Date
}

export interface CreateClassInput {
  name: string
  grade: string
  school_id: number
  academic_year_id: number
  class_advisor_id?: number | null
}

export interface UpdateClassInput {
  name?: string
  grade?: string
  class_advisor_id?: number | null
}

export interface ClassWithDetails extends Class {
  academic_year_label: string
  school_name: string
  class_advisor_name?: string
}