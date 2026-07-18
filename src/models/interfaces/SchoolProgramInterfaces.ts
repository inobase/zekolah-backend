// =====================================================
// School Program & Specialization Interfaces
// =====================================================

import { Program } from './ProgramInterfaces'
import { Specialization } from './ProgramInterfaces'

// ==================== SCHOOL PROGRAMS ====================

export interface SchoolProgram {
  id: number
  school_id: number
  program_id: number
  program?: Program
  is_active: boolean
  activated_at?: Date
  activated_by?: number | null
  created_at: Date
  updated_at: Date
}

export interface SchoolProgramCreateInput {
  school_id: number
  program_id: number
  activated_by?: number
}

export interface SchoolProgramUpdateInput {
  is_active?: boolean
  activated_at?: Date
}

// ==================== SCHOOL SPECIALIZATIONS ====================

export interface SchoolSpecialization {
  id: number
  school_program_id: number
  specialization_id: number
  specialization?: Specialization
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SchoolSpecializationCreateInput {
  school_program_id: number
  specialization_id: number
}
