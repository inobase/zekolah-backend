// =====================================================
// Teacher Interfaces
// =====================================================

export interface Teacher {
  id: number
  nip?: string | null
  user_id: number
  specialization?: string | null
  address?: string | null
  phone?: string | null
  school_id: number
  created_at: Date
  updated_at: Date
}

export interface TeacherWithUser extends Teacher {
  name: string
  email: string
}

export interface CreateTeacherInput {
  nip?: string | null
  user_id: number
  specialization?: string | null
  address?: string | null
  phone?: string | null
  school_id: number
}

export interface UpdateTeacherInput {
  nip?: string | null
  specialization?: string | null
  address?: string | null
  phone?: string | null
}