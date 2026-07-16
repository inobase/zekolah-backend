// =====================================================
// Submission Interfaces
// =====================================================

export interface Submission {
  id: number
  assignment_id: number
  student_id: number
  attachments: unknown
  comments?: string | null
  submitted_at: string | Date
  graded_at?: string | Date | null
  score?: number | null
  max_score?: number | null
  status: string
  created_at: Date
  updated_at: Date
}

export interface SubmissionWithDetails extends Submission {
  assignment_title: string
  nis: string
  student_name: string
}

export interface CreateSubmissionInput {
  assignment_id: number
  student_id: number
  attachments?: unknown
  comments?: string | null
  status?: string
}

export interface UpdateSubmissionInput {
  score?: number | null
  max_score?: number | null
  comments?: string | null
  status?: string | null
  graded_at?: Date | string | null
}