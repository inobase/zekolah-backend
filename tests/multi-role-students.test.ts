import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Student Module Tests (T5.4 — Phase 2)
 *
 * Verifies that a multi-role teacher user can correctly access,
 * create, and verify school-scoped student data by swapping x-school-id header.
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

describe('Multi-Role Student Module', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  // Schools
  let schoolAId: number
  let schoolBId: number

  // Multi-role teacher user
  let multiUserEmail: string
  let multiUserToken: string

  // Created student IDs
  let studentAId: number
  let studentBId: number

  // Helper for auth header
  const authHeader = (token: string) => ({ authorization: `Bearer ${token}` })

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
   * Create a student in a school by creating a user + student record via DB.
   * This avoids the /users endpoint which requires auth.
   */
  async function createStudentViaDB(
    email: string,
    password: string,
    schoolId: number,
    nis: string
  ): Promise<{ userId: number; studentId: number }> {
    const knex = getKnex()
    const hash = await bcrypt.hash(password, 10)

    // Insert user
    const [userId] = await knex('users').insert({
      email,
      password: hash,
      name: email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // Insert student
    const [studentId] = await knex('students').insert({
      user_id: userId,
      school_id: schoolId,
      nis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    return { userId, studentId }
  }

  beforeEach(async () => {
    app = await createTestApp()

    // Create two schools via super admin
    const superToken = await getSuperAdminToken()

    const schoolARes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: authHeader(superToken),
      payload: { name: 'School Alpha', code: 'SCH-A' },
    })
    schoolAId = JSON.parse(schoolARes.payload).id

    const schoolBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: authHeader(superToken),
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

    // Create a student in School A
    const studA = await createStudentViaDB(
      `alpha-student-${Date.now()}@test.com`,
      'Password123',
      schoolAId,
      `NIS-A-${Date.now()}`
    )
    studentAId = studA.studentId

    // Create a student in School B
    const studB = await createStudentViaDB(
      `beta-student-${Date.now()}@test.com`,
      'Password123',
      schoolBId,
      `NIS-B-${Date.now()}`
    )
    studentBId = studB.studentId
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
  // T2.1 — x-school-id=A returns School A students only
  // ==========================================================================
  it('T2.1: x-school-id=A returns School A students only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((s) => expect(s.school_id).toBe(schoolAId))

    // Should include our created student
    const ids = body.data.map((s) => s.id)
    expect(ids).toContain(studentAId)
  })

  // ==========================================================================
  // T2.2 — x-school-id=B returns School B students only
  // ==========================================================================
  it('T2.2: x-school-id=B returns School B students only', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((s) => expect(s.school_id).toBe(schoolBId))

    // Should include our created student
    const ids = body.data.map((s) => s.id)
    expect(ids).toContain(studentBId)
  })

  // ==========================================================================
  // T2.3 — GET /students/:id for School B student while context is A → 404
  // ==========================================================================
  it('T2.3: GET /students/:id for School B student while context is School A → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/students/${studentBId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })

    expect(res.statusCode).toBe(404)
  })

  // ==========================================================================
  // T2.4 — Create student with x-school-id=A → correct school_id
  // ==========================================================================
  it('T2.4: POST /students with x-school-id=A creates student with correct school_id', async () => {
    // Create user for new student
    const knex = getKnex()
    const hash = await bcrypt.hash('Password123', 10)
    const timestamp = Date.now()
    const [userId] = await knex('users').insert({
      email: `new-student-a-${timestamp}@test.com`,
      password: hash,
      name: `New Student A${timestamp}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { user_id: userId, school_id: schoolAId, nis: `NIS-NEW-${timestamp}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { id: number; school_id: number; nis: string }
    expect(body.school_id).toBe(schoolAId)
    expect(body.nis).toBe(`NIS-NEW-${timestamp}`)

    // Verify via DB
    const dbStudent = await knex('students').where({ id: body.id }).first()
    expect(dbStudent!.school_id).toBe(schoolAId)
  })

  // ==========================================================================
  // T2.5 — Create student with x-school-id=B → correct school_id
  // ==========================================================================
  it('T2.5: POST /students with x-school-id=B creates student with correct school_id', async () => {
    // Create user for new student
    const knex = getKnex()
    const hash = await bcrypt.hash('Password123', 10)
    const timestamp = Date.now()
    const [userId] = await knex('users').insert({
      email: `new-student-b-${timestamp}@test.com`,
      password: hash,
      name: `New Student B${timestamp}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { user_id: userId, school_id: schoolBId, nis: `NIS-NEW-B-${timestamp}` },
    })

    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { school_id: number; nis: string }
    expect(body.school_id).toBe(schoolBId)
    expect(body.nis).toBe(`NIS-NEW-B-${timestamp}`)
  })

  // ==========================================================================
  // T2.6 — PATCH /students/:id (School A student) with x-school-id=B → 404
  // ==========================================================================
  it('T2.6: PATCH /students/:id (School A) with x-school-id=B → 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/students/${studentAId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { address: 'Jl. Sabotage No. 1' },
    })

    expect(res.statusCode).toBe(404)
  })
})
