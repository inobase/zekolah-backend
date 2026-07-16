// =====================================================
// Role Repository — Data access layer for roles table
// =====================================================

import { Knex } from 'knex'
import { Role } from '../models/interfaces/RoleInterfaces'

export class RoleRepository {
  constructor(private knex: Knex) {}

  async findByName(name: string): Promise<Role | null> {
    const user = await this.knex('roles').where({ name: name.toLowerCase() }).first()
    return (user ?? null) as unknown as Role | null
  }

  async findById(id: number): Promise<Role | null> {
    const user = await this.knex('roles').where({ id }).first()
    return (user ?? null) as unknown as Role | null
  }

  async listAll(): Promise<Role[]> {
    return (await this.knex('roles').orderBy('name').select('*')) as unknown as Role[]
  }
}
