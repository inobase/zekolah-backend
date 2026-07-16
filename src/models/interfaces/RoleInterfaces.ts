// =====================================================
// Role & UserRole Interfaces (MySQL)
// =====================================================

// ── DB Row Types ────────────────────────────────────────

export interface Role {
  id: number
  name: string
  description?: string | null
  created_at: Date
  updated_at: Date
}

export interface UserRole {
  id: number
  user_id: number
  role_id: number
  school_id: number | null    // NULL = cross-school
  academic_year_id: number | null  // NULL = all TA
  is_active: boolean
  granted_at: Date | null
  granted_by: number | null
  created_at: Date
  updated_at: Date
}

export interface UserRoleWithDetails extends UserRole {
  role_name: string
  role_description?: string | null
}

// ── Request Body Types ──────────────────────────────────

export interface AssignRoleInput {
  user_id: number
  role_id: number
  school_id?: number | null
  academic_year_id?: number | null
}

export interface DeactivateRoleInput {
  user_role_id: number
}

// ── Fastify Request Augmentation ────────────────────────

export interface ResolvedUserRole {
  role: string          // role name (e.g., 'teacher')
  school_id: number | null
  academic_year_id: number | null
  is_active: boolean
}

export interface AugmentedUser {
  id: number
  email: string
  name?: string
  roles: ResolvedUserRole[]
  activeSchoolId: number | null
  activeAcademicYearId: number | null
}

export interface AugmentedRequest {
  // @fastify/jwt adds this, we augment further
  user: AugmentedUser
}
