// =====================================================
// User Repository — Data access layer for users table
// =====================================================

import { Knex } from 'knex'
import { AuthUser, RefreshToken } from '../models/interfaces/AuthInterfaces'

export class UserRepository {
  constructor(private knex: Knex) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.knex('users').where({ email }).first()
    return user ?? null
  }

  async findById(id: number): Promise<AuthUser | null> {
    const user = await this.knex('users').where({ id }).first()
    return user ?? null
  }

  async create(data: {
    email: string
    password: string
    name: string
    phone?: string | null
    avatar_url?: string | null
    address?: string | null
  }): Promise<AuthUser> {
    const now = new Date()
    const [id] = await this.knex('users').insert({
      email: data.email,
      password: data.password,
      name: data.name,
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    const created = await this.findById(Number(id))
    if (!created) {
      throw new Error('Failed to retrieve created user')
    }
    return created
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.knex('users').where({ id }).update({
      last_login: new Date(),
      updated_at: new Date(),
    })
  }

  // ---------- Refresh tokens ----------

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    const row = await this.knex('refresh_tokens').where({ token }).first()
    return row ?? null
  }

  async createRefreshToken(data: {
    user_id: number
    token: string
    expires_at: Date
  }): Promise<RefreshToken> {
    const [id] = await this.knex('refresh_tokens').insert({
      user_id: data.user_id,
      token: data.token,
      expires_at: data.expires_at,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const row = await this.knex('refresh_tokens').where({ id }).first()
    return row as RefreshToken
  }

  async revokeRefreshToken(token: string, reason: string): Promise<void> {
    await this.knex('refresh_tokens')
      .where({ token })
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
        updated_at: new Date(),
      })
  }

  async revokeAllForUser(userId: number, reason: string): Promise<void> {
    await this.knex('refresh_tokens')
      .where({ user_id: userId })
      .whereNull('revoked_at')
      .update({
        revoked_at: new Date(),
        revoked_reason: reason,
        updated_at: new Date(),
      })
  }
}