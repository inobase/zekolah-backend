// =====================================================
// Academic Year Interfaces
// =====================================================

export interface AcademicYear {
  id: number
  school_id: number
  year: string
  start_date: Date
  end_date: Date
  semester: string
  status: string
  created_at: Date
  updated_at: Date
}

export interface CreateAcademicYearInput {
  school_id: number
  year: string
  start_date: string
  end_date: string
  semester?: string
  status?: string
}

export interface UpdateAcademicYearInput {
  year?: string
  start_date?: string
  end_date?: string
  semester?: string
  status?: string
}

export interface AcademicYearWithSchool extends AcademicYear {
  school_name: string
}