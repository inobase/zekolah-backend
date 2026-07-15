// =====================================================
// Subject Interfaces
// =====================================================

export interface Subject {
  id: number
  name: string
  code: string
  school_id: number
  created_at: Date
  updated_at: Date
}

export interface CreateSubjectInput {
  name: string
  code: string
  school_id: number
}

export interface UpdateSubjectInput {
  name?: string
  code?: string
}
