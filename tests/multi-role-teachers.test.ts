import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Teacher Module Tests (T5.4 — Phase 3)
 *
 * Verifies that a multi-role teacher user can correctly access,
 * create, and verify school-scoped teacher data by swapping x-school-id header.
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

describe('Multi-Role Teacher Module', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  // Schools
  let schoolAId: number
  let schoolBId: number

  // Multi-role teacher user
  let multiUserEmail: string
  let multiUserToken: string

  // Created teacher IDs
  let teacherAId: number
  let teacherBId: number

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

  /**
   * Create a teacher record via DB (requires user + teachers row).
   */
  async function createTeacherViaDB(
    email: string,
    password: string,
    schoolId: number,
    nip: string
  ): Promise<{ userId: number; teacherId: number }> {
    const knex = getKnex()
    const hash = await bcrypt.hash(password, 10)

    const [userId] = await knex('users').insert({
      email,
      password: hash,
      name: email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const [teacherId] = await knex('teachers').insert({
      user_id: userId,
      school_id: schoolId,
      nip,
      specialization: 'Matematika',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return { userId, teacherId }
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

    // Create teachers in both schools
    const teaA = await createTeacherViaDB(
      `alpha-teacher-${Date.now()}@test.com`,
      'Password123',
      schoolAId,
      `NIP-A-${Date.now()}`
    )
    teacherAId = teaA.teacherId

    const teaB = await createTeacherViaDB(
      `beta-teacher-${Date.now()}@test.com`,
      'Password123',
      schoolBId,
      `NIP-B-${Date.now()}`
    )
    teacherBId = teaB.teacherId
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
  // T3.1 — x-school-id=A returns School A teachers only
  // ==========================================================================
  it('T3.1: x-school-id=A returns School A teachers only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/teachers',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((t) => expect(t.school_id).toBe(schoolAId))

    const ids = body.data.map((t) => t.id)
    expect(ids).toContain(teacherAId)
  })

  // ==========================================================================
  // T3.2 — x-school-id=B returns School B teachers only
  // ==========================================================================
  it('T3.2: x-school-id=B returns School B teachers only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/teachers',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((t) => expect(t.school_id).toBe(schoolBId))

    const ids = body.data.map((t) => t.id)
    expect(ids).toContain(teacherBId)
  })

  // ==========================================================================
  // T3.3 — GET /teachers/:id for School B teacher while context is A → 404
  // ==========================================================================
  it('T3.3: GET /teachers/:id for School B teacher while context is School A → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/teachers/${teacherBId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(404)
  })

  // ==========================================================================
  // T3.4 — Create teacher with x-school-id=A → correct school_id
  // ==========================================================================
  it('T3.4: POST /teachers with x-school-id=A creates teacher with correct school_id', async () => {
    const knex = getKnex()
    const hash = await bcrypt.hash('Password123', 10)
    const timestamp = Date.now()
    const [userId] = await knex('users').insert({
      email: `new-teacher-a-${timestamp}@test.com`,
      password: hash,
      name: `New Teacher A${timestamp}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/teachers',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { user_id: userId, school_id: schoolAId, nip: `NIP-NEW-${timestamp}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { id: number; school_id: number; nip: string }
    expect(body.school_id).toBe(schoolAId)
    expect(body.nip).toBe(`NIP-NEW-${timestamp}`)

    // Verify via DB
    const dbTeacher = await knex('teachers').where({ id: body.id }).first()
    expect(dbTeacher!.school_id).toBe(schoolAId)
  })

  // ==========================================================================
  // T3.5 — Create teacher with x-school-id=B → correct school_id
  // ==========================================================================
  it('T3.5: POST /teachers with x-school-id=B creates teacher with correct school_id', async () => {
    const knex = getKnex()
    const hash = await bcrypt.hash('Password123', 10)
    const timestamp = Date.now()
    const [userId] = await knex('users').insert({
      email: `new-teacher-b-${timestamp}@test.com`,
      password: hash,
      name: `New Teacher B${timestamp}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/teachers',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { user_id: userId, school_id: schoolBId, nip: `NIP-NEW-B-${timestamp}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { school_id: number; nip: string }
    expect(body.school_id).toBe(schoolBId)
    expect(body.nip).toBe(`NIP-NEW-B-${timestamp}`)
  })

  // ==========================================================================
  // T3.6 — PATCH /teachers/:id (School A) with x-school-id=B → 404
  // ==========================================================================
  it('T3.6: PATCH /teachers/:id (School A) with x-school-id=B → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/teachers/${teacherAId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { address: 'Jl. Sabotage No. 1' },
    })

    expect(res.statusCode).toBe(404)
  })
})
