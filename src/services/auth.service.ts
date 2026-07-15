// =====================================================
// Auth Service — Business logic for authentication
// =====================================================

import bcrypt from 'bcryptjs'
import { Knex } from 'knex'
import { FastifyInstance } from 'fastify'
import { config } from '../config'
import { AppError } from '../utils/AppError'
import { UserRepository } from '../repositories/user.repository'
import { AuthUser, AuthTokenResponse, SafeUser } from '../models/interfaces/AuthInterfaces'
import { LoginInput, RegisterInput, RefreshInput } from '../validators/auth.validator'

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
      role: data.role,
    })

    const safe = this.stripPassword(user)
    const token = app.jwt.sign({ id: safe.id, email: safe.email, role: safe.role })
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

    const safe = this.stripPassword(user)
    const token = app.jwt.sign({ id: safe.id, email: safe.email, role: safe.role })
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