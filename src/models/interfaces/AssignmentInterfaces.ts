// =====================================================
// Assignment Interfaces
// =====================================================

export interface Assignment {
  id: number
  teacher_id: number
  class_id: number
  subject_id: number
  academic_year_id: number
  title: string
  description?: string | null
  due_date: string | Date
  max_score: number
  attachments: unknown
  created_at: Date
  updated_at: Date
}

export interface AssignmentWithDetails extends Assignment {
  subject_name: string
  subject_code: string
  class_name: string
  teacher_name: string
}

export interface CreateAssignmentInput {
  teacher_id: number
  class_id: number
  subject_id: number
  academic_year_id: number
  title: string
  description?: string | null
  due_date: string | Date
  max_score: number
  attachments?: unknown
}

export interface UpdateAssignmentInput {
  title?: string | null
  description?: string | null
  due_date?: string | Date | null
  max_score?: number | null
  attachments?: unknown | null
}
