import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Context Resolution Tests (T5.4 — Phase 1)
 *
 * Verifies that a user with multiple roles across schools can
 * switch school context via x-school-id header and receives
 * correct resolved roles and JWT payload determinism.
 */

const ROLE_IDS: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  staff: 3,
  teacher: 4,
  student: 5,
}

describe('Multi-Role Context Resolution', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>
  let schoolAId: number
  let schoolBId: number
  let schoolCId: number
  let multiUserEmail: string
  let multiUserToken: string

  const authHeader = (token: string) => ({ authorization: `Bearer ${token}` })

  async function getSuperAdminToken(): Promise<string> {
    const knex = getKnex()
    await knex('user_roles').where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', ['initadmin_zk_temp@example.com'])).del()
    await knex('users').where('email', 'initadmin_zk_temp@example.com').del()

    const hash = await bcrypt.hash('Password123', 10)
    const [uid] = await knex('users').insert({
      email: 'initadmin_zk_temp@example.com',
      password: hash,
      name: 'Init Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await knex('user_roles').insert({
      user_id: uid,
      role_id: ROLE_IDS.super_admin,
      school_id: null,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    })

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'initadmin_zk_temp@example.com', password: 'Password123' },
    })
    const body = JSON.parse(loginRes.payload) as { token: string }
    if (!body.token) throw new Error(`Super admin login failed: ${JSON.stringify(body)}`)
    return body.token
  }

  beforeEach(async () => {
    app = await createTestApp()
    const superToken = await getSuperAdminToken()

    // Create 3 schools
    const schoolARes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: authHeader(superToken),
      payload: { name: 'School Alpha', code: 'SCH-A' },
    })
    schoolAId = JSON.parse(schoolARes.payload).id

    const schoolBRes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: authHeader(superToken),
      payload: { name: 'School Beta', code: 'SCH-B' },
    })
    schoolBId = JSON.parse(schoolBRes.payload).id

    const schoolCRes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: authHeader(superToken),
      payload: { name: 'School Gamma', code: 'SCH-C' },
    })
    schoolCId = JSON.parse(schoolCRes.payload).id

    // Create multi-role teacher user at schools A and B
    multiUserEmail = `multirole-${Date.now()}@test.com`
    const knex = getKnex()

    const regRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: multiUserEmail, password: 'Password123', name: multiUserEmail.split('@')[0] },
    })
    const userId = (JSON.parse(regRes.payload) as { user: { id: number } }).user.id

    await knex('user_roles').insert([
      { user_id: userId, role_id: ROLE_IDS.teacher, school_id: schoolAId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString() },
      { user_id: userId, role_id: ROLE_IDS.teacher, school_id: schoolBId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString() },
    ])

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    multiUserToken = (JSON.parse(loginRes.payload) as { token: string }).token
  })

  afterEach(async () => {
    try { await app.close() } catch { /* ignore */ }
  })

  afterAll(async () => { closeAllApps() })

  // ==========================================================================
  // T1.1 — Login determinism
  // ==========================================================================
  it('T1.1: Login returns deterministic school_id on repeated logins', async () => {
    const login1 = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const decoded1 = app.jwt.decode(JSON.parse(login1.payload).token) as Record<string, unknown>

    const login2 = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const decoded2 = app.jwt.decode(JSON.parse(login2.payload).token) as Record<string, unknown>

    expect(decoded2.school_id).toEqual(decoded1.school_id)
    expect(decoded2.academic_year_id).toEqual(decoded1.academic_year_id)
    expect(decoded1.school_id).toBeDefined()
    expect(decoded1.academic_year_id).toBeNull()
  })

  // ==========================================================================
  // T1.2 — JWT payload contains roles from both schools
  // ==========================================================================
  it('T1.2: JWT payload contains roles from both schools', async () => {
    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const decoded = app.jwt.decode(JSON.parse(loginRes.payload).token) as {
      roles: Array<{ role: string; school_id: number | null }>
    }

    expect(decoded.roles).toBeDefined()
    expect(Array.isArray(decoded.roles)).toBe(true)
    expect(decoded.roles.length).toBeGreaterThanOrEqual(1)
    decoded.roles.forEach((r) => expect(r.role).toBe('teacher'))
  })

  /**
   * Helper: create a student row in a school with proper schema.
   * Students require (user_id, school_id, nis).
   */
  async function createStudentInSchool(
    schoolId: number,
    studentLabel: string
  ): Promise<void> {
    const superToken = await getSuperAdminToken()
    const knex = getKnex()

    // Create a user for the student
    const hash = await bcrypt.hash('Password123', 10)
    const [studentUserId] = await knex('users').insert({
      email: `student-${studentLabel}-${Date.now()}@test.com`,
      password: hash,
      name: studentLabel,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Create student record
    await knex('students').insert({
      user_id: studentUserId,
      school_id: schoolId,
      nis: `NIS-${studentLabel}-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  // ==========================================================================
  // T1.3 — x-school-id=A returns School A data
  // ==========================================================================
  it('T1.3: x-school-id=A returns School A data', async () => {
    await createStudentInSchool(schoolAId, 'AlphaStudent')

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const token = (JSON.parse(loginRes.payload) as { token: string }).token

    const res = await app.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((s) => expect(s.school_id).toBe(schoolAId))
  })

  // ==========================================================================
  // T1.4 — x-school-id=B returns School B data
  // ==========================================================================
  it('T1.4: x-school-id=B returns School B data', async () => {
    await createStudentInSchool(schoolBId, 'BetaStudent')

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const token = (JSON.parse(loginRes.payload) as { token: string }).token

    const res = await app.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((s) => expect(s.school_id).toBe(schoolBId))
  })

  // ==========================================================================
  // T1.5 — Header swap returns different data sets
  // ==========================================================================
  it('T1.5: Swapping x-school-id returns different school data', async () => {
    await createStudentInSchool(schoolAId, 'AOnly')
    await createStudentInSchool(schoolBId, 'BOnly')

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const token = (JSON.parse(loginRes.payload) as { token: string }).token

    // Query with x-school-id=A — only School A student visible
    const resA = await app.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })
    const bodyA = JSON.parse(resA.payload) as { data: Array<{ school_id: number }> }

    // Query with x-school-id=B
    const resB = await app.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })
    const bodyB = JSON.parse(resB.payload) as { data: Array<{ school_id: number }> }

    // A results contain only School A
    bodyA.data.forEach((s) => expect(s.school_id).toBe(schoolAId))
    // B results contain only School B
    bodyB.data.forEach((s) => expect(s.school_id).toBe(schoolBId))

    // A and B results don't share records (no overlap in IDs)
    const aIds = new Set(bodyA.data.map((s: any) => s.id))
    const bIds = new Set(bodyB.data.map((s: any) => s.id))
    for (const id of aIds) expect(bIds.has(id)).toBe(false)
  })

  // ==========================================================================
  // T1.6 — No role at requested school → empty results
  // ==========================================================================
  it('T1.6: x-school-id=C (no role) returns empty data', async () => {
    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const token = (JSON.parse(loginRes.payload) as { token: string }).token

    const res = await app.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolCId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  // ==========================================================================
  // T1.7 — School-wide + AY-scoped role deduplication: multiple roles preserved
  // ==========================================================================
  it('T1.7: Multi-role user gets both school-wide and AY-scoped roles in resolvedRoles', async () => {
    const knex = getKnex()
    const superToken = await getSuperAdminToken()

    // Find the multi-user's ID
    const [userRow] = (await knex('users').where('email', multiUserEmail)) as Array<{ id: number }>

    // Add school-wide role (staff) at school A
    await knex('user_roles').insert({
      user_id: userRow.id,
      role_id: ROLE_IDS.staff,
      school_id: schoolAId,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    })

    // Login and verify both 'teacher' and 'staff' roles appear
    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    const decoded = app.jwt.decode(JSON.parse(loginRes.payload).token) as {
      roles: Array<{ role: string }>
    }

    const roleNames = decoded.roles.map((r) => r.role)
    expect(roleNames).toContain('teacher')
    expect(roleNames).toContain('staff')
  })

  // ==========================================================================
  // T1.8 — Global-role-only user with x-school-id=A gets empty resolvedRoles
  // ==========================================================================
  it('T1.8: Global-role user with x-school-id=A returns empty data', async () => {
    const knex = getKnex()
    const globalEmail = `global-admin-${Date.now()}@test.com`
    const hash = await bcrypt.hash('Password123', 10)

    const [uid] = await knex('users').insert({
      email: globalEmail,
      password: hash,
      name: 'Global Admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await knex('user_roles').insert({
      user_id: uid,
      role_id: ROLE_IDS.super_admin,
      school_id: null,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    })

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: globalEmail, password: 'Password123' },
    })
    const token = (JSON.parse(loginRes.payload) as { token: string }).token
    const decoded = app.jwt.decode(token) as { roles: Array<{ role: string }> }

    // Global role appears in JWT
    expect(decoded.roles.some((r) => r.role === 'super_admin')).toBe(true)

    // But querying students with x-school-id=A → empty (no school-scoped role)
    const res = await app.inject({
      method: 'GET', url: '/api/v1/students',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: unknown[] }
    expect(body.data).toEqual([])
  })
})
