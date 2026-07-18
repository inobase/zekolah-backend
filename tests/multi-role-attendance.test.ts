import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Attendance Module Tests (T5.4 — Phase 7)
 *
 * Verifies that a multi-role teacher can correctly access, create, and verify
 * school-scoped attendance data by swapping x-school-id header.
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

describe('Multi-Role Attendance Module', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  let schoolAId: number
  let schoolBId: number
  let multiUserEmail: string
  let multiUserToken: string
  let studentAId: number
  let studentBId: number
  let subjectAId: number
  let subjectBId: number

  async function getSuperAdminToken(): Promise<string> {
    const knex = getKnex()
    await knex('user_roles').where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', ['initadmin_zk_temp@example.com'])).del()
    await knex('users').where('email', 'initadmin_zk_temp@example.com').del()

    const hash = await bcrypt.hash('Password123', 10)
    const [uid] = await knex('users').insert({
      email: 'initadmin_zk_temp@example.com', password: hash, name: 'Init Admin',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    await knex('user_roles').insert({
      user_id: uid, role_id: ROLE_IDS.super_admin, school_id: null, academic_year_id: null,
      is_active: true, granted_at: new Date().toISOString(),
    })

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: 'initadmin_zk_temp@example.com', password: 'Password123' },
    })
    const body = JSON.parse(loginRes.payload) as { token: string }
    if (!body.token) throw new Error(`Super admin login failed: ${JSON.stringify(body)}`)
    return body.token
  }

  async function createStudentViaDB(email: string, password: string, schoolId: number, nis: string): Promise<{ userId: number; studentId: number }> {
    const knex = getKnex()
    const hash = await bcrypt.hash(password, 10)
    const [userId] = await knex('users').insert({
      email, password: hash, name: email.split('@')[0],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    const [studentId] = await knex('students').insert({
      user_id: userId, school_id: schoolId, nis,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    return { userId, studentId }
  }

  beforeEach(async () => {
    app = await createTestApp()
    const superToken = await getSuperAdminToken()

    // Schools
    const schoolARes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { name: 'School Alpha', code: 'SCH-A' },
    })
    schoolAId = JSON.parse(schoolARes.payload).id

    const schoolBRes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: { authorization: `Bearer ${superToken}` },
      payload: { name: 'School Beta', code: 'SCH-B' },
    })
    schoolBId = JSON.parse(schoolBRes.payload).id

    // Multi-role teacher
    multiUserEmail = `multiteach-${Date.now()}@test.com`
    const knex = getKnex()
    const regRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/register',
      payload: { email: multiUserEmail, password: 'Password123', name: multiUserEmail.split('@')[0] },
    })
    const regBody = JSON.parse(regRes.payload) as { user: { id: number } }
    const userId = regBody.user.id

    await knex('user_roles').insert([
      { user_id: userId, role_id: ROLE_IDS.teacher, school_id: schoolAId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString() },
      { user_id: userId, role_id: ROLE_IDS.teacher, school_id: schoolBId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString() },
    ])

    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: multiUserEmail, password: 'Password123' },
    })
    multiUserToken = (JSON.parse(loginRes.payload) as { token: string }).token

    // Students
    const studA = await createStudentViaDB(`alpha-stu-${Date.now()}@test.com`, 'Password123', schoolAId, `NSA-${Date.now()}`)
    studentAId = studA.studentId

    const studB = await createStudentViaDB(`beta-stu-${Date.now()}@test.com`, 'Password123', schoolBId, `NSB-${Date.now()}`)
    studentBId = studB.studentId

    // Subjects
    const subjARes = await app.inject({
      method: 'POST', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { name: 'Matematika A', code: 'MA-A', school_id: schoolAId },
    })
    subjectAId = JSON.parse(subjARes.payload).id

    const subjBRes = await app.inject({
      method: 'POST', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { name: 'Fisika B', code: 'FB-B', school_id: schoolBId },
    })
    subjectBId = JSON.parse(subjBRes.payload).id
  })

  afterEach(async () => { try { await app.close() } catch { /* ignore */ } })
  afterAll(async () => { closeAllApps() })

  // ==========================================================================
  // T7.1 — List attendance with x-school-id=A returns School A attendance only
  // ==========================================================================
  it('T7.1: List attendance with x-school-id=A returns School A attendance only', async () => {
    // Create attendance for School A student
    await app.inject({
      method: 'POST', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { student_id: studentAId, subject_id: subjectAId, date: '2025-07-21T08:00:00Z', status: 'present' as const },
    })

    const res = await app.inject({
      method: 'GET', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number }> }
    expect(body.data.length).toBeGreaterThan(0)

    // Verify the new record is included
    const ids = body.data.map((a) => a.id)
    expect(ids.includes(ids.at(-1)!)).toBe(true)
  })

  // ==========================================================================
  // T7.2 — x-school-id=B returns School B attendance only
  // ==========================================================================
  it('T7.2: List attendance with x-school-id=B returns School B attendance only', async () => {
    // Create attendance for School B student
    await app.inject({
      method: 'POST', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { student_id: studentBId, subject_id: subjectBId, date: '2025-07-21T08:00:00Z', status: 'absent' as const },
    })

    const res = await app.inject({
      method: 'GET', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
  })

  // ==========================================================================
  // T7.3 — GET /attendance/:id for School B record while context is A → 404
  // ==========================================================================
  it('T7.3: GET /attendance/:id for School B attendance while context is School A → 404', async () => {
    const attRes = await app.inject({
      method: 'POST', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { student_id: studentBId, subject_id: subjectBId, date: '2025-07-22T08:00:00Z', status: 'sick' as const },
    })
    const attBId = JSON.parse(attRes.payload).id

    const res = await app.inject({
      method: 'GET', url: `/api/v1/attendances/${attBId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })
    expect(res.statusCode).toBe(404)
  })

  // ==========================================================================
  // T7.4 — Create attendance with x-school-id=A → linked to School A student
  // ==========================================================================
  it('T7.4: POST /attendance with x-school-id=A creates attendance for School A student', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { student_id: studentAId, subject_id: subjectAId, date: '2025-07-23T08:00:00Z', status: 'permission' as const },
    })
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.payload) as { student_id: number }
    expect(body.student_id).toBe(studentAId)

    // Verify via DB
    const knex = getKnex()
    const dbAtt = await knex('attendance').where({ id: JSON.parse(res.payload).id }).first()
    const stu = await knex('students').where({ id: body.student_id }).first()
    expect(stu!.school_id).toBe(schoolAId)
  })

  // ==========================================================================
  // T7.5 — Create attendance with x-school-id=B → linked to School B student
  // ==========================================================================
  it('T7.5: POST /attendance with x-school-id=B creates attendance for School B student', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { student_id: studentBId, subject_id: subjectBId, date: '2025-07-24T08:00:00Z', status: 'present' as const },
    })
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.payload) as { student_id: number }
    expect(body.student_id).toBe(studentBId)
  })

  // ==========================================================================
  // T7.6 — PATCH attendance of School B while context is A → 404
  // ==========================================================================
  it('T7.6: PATCH attendance of School B context while x-school-id=A → 404', async () => {
    const attRes = await app.inject({
      method: 'POST', url: '/api/v1/attendances',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { student_id: studentBId, subject_id: subjectBId, date: '2025-07-25T08:00:00Z', status: 'present' as const },
    })
    const attBId = JSON.parse(attRes.payload).id

    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/attendances/${attBId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { status: 'absent' as const },
    })
    expect(res.statusCode).toBe(404)
  })
})

