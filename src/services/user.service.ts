// =====================================================
// User Service
// =====================================================

import { Knex } from 'knex'
import { UserRepository } from '../repositories/user.repository'
import { AppError } from '../utils/AppError'

const SAFE_FIELDS = [
  'id', 'email', 'name', 'status', 'phone', 'avatar_url', 'address', 'created_at', 'updated_at',
] as const

export type SafeUser = {
  id: number
  email: string
  name: string
  status: string
  phone: string | null
  avatar_url: string | null
  address: string | null
  created_at: Date
  updated_at: Date
}

function stripPassword<T extends Record<string, any>>(u: T): Omit<T, 'password'> {
  const { password: _pw, ...rest } = u
  return rest
}

export class UserService {
  private repo: UserRepository

  constructor(private knex: Knex) {
    this.repo = new UserRepository(knex)
  }

  async list(filter: {
    page: number
    limit: number
    status?: string
    search?: string
    school_id?: number
  }): Promise<{ data: SafeUser[]; pagination: { page: number; limit: number; total: number } }> {
    const { page, limit, status, search } = filter
    const offset = (page - 1) * limit

    let q = this.knex('users')
      .select('id', 'email', 'name', 'status', 'phone', 'avatar_url', 'address', 'created_at')
    if (search) {
      q.where((qb: any) => qb.whereLike('name', `%${search}%`).orWhereLike('email', `%${search}%`))
    }
    if (status) q.where({ status })

    // Phase 2: filter users by school_id (only for teachers/students with school assignment)
    let totalCountQuery = this.knex('users')
    if (filter.school_id) {
      // Only return users who are teachers or students belonging to this school
      q = this.knex('users')
        .innerJoin('teachers', 'users.id', 'teachers.user_id')
        .select('users.id', 'users.email', 'users.name', 'users.status', 'users.phone', 'users.avatar_url', 'users.address', 'users.created_at')
        .where('teachers.school_id', filter.school_id)
      if (search) {
        q.where((qb: any) => qb.whereLike('users.name', `%${search}%`).orWhereLike('users.email', `%${search}%`))
      }
      if (status) q.where('users.status', status)
    }

    let countResult
    if (filter.school_id) {
      // Count via teachers table to apply school filter
      const rawCount = await this.knex('teachers')
        .join('users', 'teachers.user_id', 'users.id')
        .where('teachers.school_id', filter.school_id)
        .count<{ count: string }[]>('* as count')
      countResult = rawCount[0]
    } else {
      countResult = await this.knex('users')
        .count<{ count: string }[]>('* as count')
        .modify((qb) => {
          if (search) {
            qb.where((b: any) => b.whereLike('name', `%${search}%`).orWhereLike('email', `%${search}%`))
          }
          if (status) qb.where({ status })
        })
    }

    q.limit(limit).offset(offset)
    const rows = await q
    return {
      data: rows.map((u: any) => stripPassword(u) as SafeUser),
      pagination: { page, limit, total: Number(countResult?.count ?? 0) },
    }
  }

  async getById(id: number): Promise<SafeUser> {
    const user = await this.repo.findById(id)
    if (!user) throw new AppError('NOT_FOUND', 'User not found')
    return stripPassword(user) as SafeUser
  }

  async create(body: Record<string, unknown>): Promise<SafeUser> {
    const { email, password, name, phone, avatar_url, address } = body as {
      email: string; password: string; name: string; phone?: string | null; avatar_url?: string | null; address?: string | null
    }
    const created = await this.repo.create({ email, password, name, phone, avatar_url, address })
    return stripPassword(created) as SafeUser
  }

  async update(id: number, body: Record<string, unknown>): Promise<SafeUser> {
    const allowed = ['name', 'email', 'phone', 'avatar_url', 'address']
    const updates: Record<string, unknown> = {}
    for (const field of allowed) {
      if (body[field] !== undefined) updates[field] = body[field]
    }
    if (Object.keys(updates).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No valid fields to update')
    }
    updates.updated_at = new Date()
    await this.knex('users').where({ id }).update(updates)
    const updated = await this.repo.findById(id)
    if (!updated) throw new AppError('NOT_FOUND', 'User not found')
    return stripPassword(updated) as SafeUser
  }

  async deactivate(id: number): Promise<void> {
    const exists = await this.repo.findById(id)
    if (!exists) throw new AppError('NOT_FOUND', 'User not found')
    await this.knex('users')
      .where({ id })
      .update({ status: 'inactive', updated_at: new Date() })
  }
}