import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Class Module Tests (T5.4 — Phase 4)
 *
 * Verifies that a multi-role teacher user can correctly access,
 * create, and verify school-scoped class data by swapping x-school-id header.
 *
 * Auth response format: { user: { id, email, ... }, token: "eyJ..." }
 */

const ROLE_IDS: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  staff: 3,
  teacher: 4,
  student: 5,
}

describe('Multi-Role Class Module', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  // Schools
  let schoolAId: number
  let schoolBId: number

  // Academic years (needed for class creation)
  let academicYearAId: number
  let academicYearBId: number

  // Multi-role teacher user
  let multiUserEmail: string
  let multiUserToken: string

  // Created class IDs
  let classAId: number
  let classBId: number

  /**
   * Create super admin token (global role, no school).
   */
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
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'initadmin_zk_temp@example.com', password: 'Password123' },
    })
    const body = JSON.parse(loginRes.payload) as { token: string }
    if (!body.token) throw new Error(`Super admin login failed: ${JSON.stringify(body)}`)
    return body.token
  }

  beforeEach(async () => {
    app = await createTestApp()

    // Create two schools via super admin
    const superToken = await getSuperAdminToken()

    const schoolARes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { name: 'School Alpha', code: 'SCH-A' },
    })
    schoolAId = JSON.parse(schoolARes.payload).id

    const schoolBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { name: 'School Beta', code: 'SCH-B' },
    })
    schoolBId = JSON.parse(schoolBRes.payload).id

    // Create academic years for each school (needed for class creation)
    const ayARes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic-years',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { school_id: schoolAId, year: '2025/2026-A', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' },
    })
    academicYearAId = JSON.parse(ayARes.payload).id

    const ayBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic-years',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { school_id: schoolBId, year: '2025/2026-B', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' },
    })
    academicYearBId = JSON.parse(ayBRes.payload).id

    // Create multi-role teacher user at schools A and B
    multiUserEmail = `multiteach-${Date.now()}@test.com`
    const knex = getKnex()

    // Register via API
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: multiUserEmail, password: 'Password123', name: multiUserEmail.split('@')[0] },
    })
    const regBody = JSON.parse(regRes.payload) as { user: { id: number } }
    const userId = regBody.user.id

    // Assign teacher role at schools A and B
    await knex('user_roles').insert([
      { user_id: userId, role_id: ROLE_IDS.teacher, school_id: schoolAId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString() },
      { user_id: userId, role_id: ROLE_IDS.teacher, school_id: schoolBId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString() },
    ])

    // Login to get token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    multiUserToken = (JSON.parse(loginRes.payload) as { token: string }).token

    // Create classes in both schools
    const classARes = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { school_id: schoolAId, academic_year_id: academicYearAId, name: 'X IPA A', grade: '10' },
    })
    classAId = JSON.parse(classARes.payload).id

    const classBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { school_id: schoolBId, academic_year_id: academicYearBId, name: 'XI IPS B', grade: '11' },
    })
    classBId = JSON.parse(classBRes.payload).id
  })

  afterEach(async () => {
    try {
      await app.close()
    } catch { /* ignore */ }
  })

  afterAll(async () => {
    closeAllApps()
  })

  // ==========================================================================
  // T4.1 — x-school-id=A returns School A classes only
  // ==========================================================================
  it('T4.1: x-school-id=A returns School A classes only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/classes',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((c) => expect(c.school_id).toBe(schoolAId))

    const ids = body.data.map((c) => c.id)
    expect(ids).toContain(classAId)
  })

  // ==========================================================================
  // T4.2 — x-school-id=B returns School B classes only
  // ==========================================================================
  it('T4.2: x-school-id=B returns School B classes only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/classes',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((c) => expect(c.school_id).toBe(schoolBId))

    const ids = body.data.map((c) => c.id)
    expect(ids).toContain(classBId)
  })

  // ==========================================================================
  // T4.3 — GET /classes/:id for School B class while context is A → 404
  // ==========================================================================
  it('T4.3: GET /classes/:id for School B class while context is School A → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/classes/${classBId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(404)
  })

  // ==========================================================================
  // T4.4 — Create class with x-school-id=A → correct school_id
  // ==========================================================================
  it('T4.4: POST /classes with x-school-id=A creates class with correct school_id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { school_id: schoolAId, academic_year_id: academicYearAId, name: 'XII IPA A', grade: '12' },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { id: number; school_id: number; name: string; grade: string }
    expect(body.school_id).toBe(schoolAId)
    expect(body.name).toBe('XII IPA A')
    expect(body.grade).toBe('12')

    // Verify via DB
    const knex = getKnex()
    const dbClass = await knex('classes').where({ id: body.id }).first()
    expect(dbClass!.school_id).toBe(schoolAId)
  })

  // ==========================================================================
  // T4.5 — Create class with x-school-id=B → correct school_id
  // ==========================================================================
  it('T4.5: POST /classes with x-school-id=B creates class with correct school_id', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { school_id: schoolBId, academic_year_id: academicYearBId, name: 'XII IPS B', grade: '12' },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { school_id: number; name: string; grade: string }
    expect(body.school_id).toBe(schoolBId)
    expect(body.name).toBe('XII IPS B')
  })

  // ==========================================================================
  // T4.6 — PATCH /classes/:id (School A) with x-school-id=B → 404
  // ==========================================================================
  it('T4.6: PATCH /classes/:id (School A) with x-school-id=B → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/classes/${classAId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { name: 'Changed Name (Sabotage)' },
    })

    expect(res.statusCode).toBe(404)
  })
})
