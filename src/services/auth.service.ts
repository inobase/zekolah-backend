// =====================================================
// Auth Service — Business logic for authentication
// =====================================================

import bcrypt from 'bcryptjs'
import { Knex } from 'knex'
import { FastifyInstance } from 'fastify'
import { config } from '../config'
import { AppError } from '../utils/AppError'
import { UserRepository } from '../repositories/user.repository'
import { UserRoleRepository } from '../repositories/userRole.repository'
import { AuthUser, AuthTokenResponse, SafeUser } from '../models/interfaces/AuthInterfaces'
import { LoginInput, RegisterInput, RefreshInput } from '../validators/auth.validator'
import { ResolvedUserRole } from '../models/interfaces/RoleInterfaces'

export class AuthService {
  private userRepo: UserRepository

  constructor(private knex: Knex) {
    this.userRepo = new UserRepository(knex)
  }

  private stripPassword(user: AuthUser): SafeUser {
    const { password, ...safe } = user as AuthUser & { password?: string }
    return safe
  }

  async register(
    app: FastifyInstance,
    data: RegisterInput
  ): Promise<AuthTokenResponse> {
    const existing = await this.userRepo.findByEmail(data.email)
    if (existing) {
      throw new AppError('ALREADY_EXISTS', 'Email is already registered')
    }

    const hash = await bcrypt.hash(data.password, config.bcryptRounds)
    const user = await this.userRepo.create({
      email: data.email,
      password: hash,
      name: data.name,
    })

    const safe = this.stripPassword(user)
    // Phase 4: new registrants typically have no roles yet, so no context
    const tokenPayload = {
      id: safe.id,
      email: safe.email,
      school_id: null as number | null,
      academic_year_id: null as number | null,
    }
    const token = app.jwt.sign(tokenPayload)
    return { user: safe, token }
  }

  async login(app: FastifyInstance, data: LoginInput): Promise<AuthTokenResponse> {
    const user = await this.userRepo.findByEmail(data.email)
    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    const valid = await bcrypt.compare(data.password, (user as AuthUser & { password: string }).password)
    if (!valid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password')
    }

    if (user.status !== 'active') {
      throw new AppError('FORBIDDEN', 'Account is not active')
    }

    await this.userRepo.updateLastLogin(user.id)

    // Phase 4: resolve roles + school/year context for JWT payload
    const userRoleRepo = new UserRoleRepository(this.knex)
    const allRoles = await userRoleRepo.findAllActiveForUser(user.id)

    // Deterministic context selection: highest specificity first
    // Priority: (1) exact school+AY, (2) school-wide, (3) global
    allRoles.sort((a, b) => {
      const score = (role: ResolvedUserRole) => {
        const schoolScore = role.school_id != null ? 1 : 0
        const ayScore = role.academic_year_id != null ? 1 : 0
        return schoolScore * 2 + ayScore  // 3=exact, 2=school-wide, 1=global-null, 0=fully-global
      }
      return score(b) - score(a)  // highest score first
    })

    let ctxSchoolId: number | null = null
    let ctxAYId: number | null = null
    for (const role of allRoles) {
      if (role.school_id != null && role.academic_year_id != null) {
        ctxSchoolId = role.school_id
        ctxAYId = role.academic_year_id
        break
      }
      if (ctxSchoolId == null && role.school_id != null) {
        ctxSchoolId = role.school_id
      }
    }

    const safe = this.stripPassword(user)
    const tokenPayload = {
      id: safe.id,
      email: safe.email,
      school_id: ctxSchoolId,
      academic_year_id: ctxAYId,
      roles: allRoles.map((r) => ({ role: r.role, school_id: r.school_id, academic_year_id: r.academic_year_id })),
    }
    const token = app.jwt.sign(tokenPayload)
    return { user: safe, token }
  }

  async me(userId: number): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found')
    }
    return this.stripPassword(user)
  }

  async logout(userId: number, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.userRepo.revokeRefreshToken(refreshToken, 'logout')
    } else {
      await this.userRepo.revokeAllForUser(userId, 'logout')
    }
  }
}