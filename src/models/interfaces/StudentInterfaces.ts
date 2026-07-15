// =====================================================
// Student Interfaces
// =====================================================

export interface Student {
  id: number
  nis: string
  nisn?: string | null
  user_id: number
  class_id?: number | null
  address?: string | null
  phone?: string | null
  date_of_birth?: string | null
  gender?: string | null
  school_id: number
  created_at: Date
  updated_at: Date
}

export interface StudentWithUser extends Student {
  name: string
  email: string
}

export interface CreateStudentInput {
  nis: string
  nisn?: string | null
  user_id: number
  class_id?: number | null
  address?: string | null
  phone?: string | null
  date_of_birth?: string | null
  gender?: string | null
  school_id: number
}

export interface UpdateStudentInput {
  nis?: string
  nisn?: string | null
  class_id?: number | null
  address?: string | null
  phone?: string | null
  date_of_birth?: string | null
  gender?: string | null
}