// =====================================================
// Attendance Interfaces
// =====================================================

export interface Attendance {
  id: number
  student_id: number
  subject_id: number
  date: Date
  status: string
  created_at: Date
  updated_at: Date
}

export interface AttendanceWithDetails extends Attendance {
  nis: string
  nisn?: string | null
  student_name: string
  subject_name: string
  subject_code: string
}

export interface CreateAttendanceInput {
  student_id: number
  subject_id: number
  date: string
  status: string
}

export interface UpdateAttendanceInput {
  student_id?: number | null
  subject_id?: number | null
  date?: string | null
  status?: string | null
}
