import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Subject Module Tests (T5.4 — Phase 5)
 *
 * Verifies that a multi-role teacher user can correctly access,
 * create, and verify school-scoped subject data by swapping x-school-id header.
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

describe('Multi-Role Subject Module', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>

  let schoolAId: number
  let schoolBId: number
  let multiUserEmail: string
  let multiUserToken: string
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

  beforeEach(async () => {
    app = await createTestApp()

    const superToken = await getSuperAdminToken()

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

    // Multi-role teacher at both schools
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

    // Create subjects in both schools
    const subjARes = await app.inject({
      method: 'POST', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { name: 'Matematika A', code: 'MATH-A', school_id: schoolAId },
    })
    subjectAId = JSON.parse(subjARes.payload).id

    const subjBRes = await app.inject({
      method: 'POST', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { name: 'Fisika B', code: 'PHYS-B', school_id: schoolBId },
    })
    subjectBId = JSON.parse(subjBRes.payload).id
  })

  afterEach(async () => { try { await app.close() } catch { /* ignore */ } })
  afterAll(async () => { closeAllApps() })

  // ==========================================================================
  // T5.1 — x-school-id=A returns School A subjects only
  // ==========================================================================
  it('T5.1: x-school-id=A returns School A subjects only', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((s) => expect(s.school_id).toBe(schoolAId))
    const ids = body.data.map((s) => s.id)
    expect(ids).toContain(subjectAId)
  })

  // ==========================================================================
  // T5.2 — x-school-id=B returns School B subjects only
  // ==========================================================================
  it('T5.2: x-school-id=B returns School B subjects only', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload) as { data: Array<{ id: number; school_id: number }> }
    expect(body.data.length).toBeGreaterThan(0)
    body.data.forEach((s) => expect(s.school_id).toBe(schoolBId))
    const ids = body.data.map((s) => s.id)
    expect(ids).toContain(subjectBId)
  })

  // ==========================================================================
  // T5.3 — GET /subjects/:id for School B while context is A → 404
  // ==========================================================================
  it('T5.3: GET /subjects/:id for School B while context is School A → 404', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/subjects/${subjectBId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
    })
    expect(res.statusCode).toBe(404)
  })

  // ==========================================================================
  // T5.4 — Create subject with x-school-id=A → correct school_id
  // ==========================================================================
  it('T5.4: POST /subjects with x-school-id=A creates subject with correct school_id', async () => {
    const ts = Date.now()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolAId) },
      payload: { name: 'Kimia A', code: `CHEM-A-${ts}`, school_id: schoolAId },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { school_id: number; code: string }
    expect(body.school_id).toBe(schoolAId)
    expect(body.code).toBe(`CHEM-A-${ts}`)

    const knex = getKnex()
    const dbSubj = await knex('subjects').where({ id: JSON.parse(res.payload).id }).first()
    expect(dbSubj!.school_id).toBe(schoolAId)
  })

  // ==========================================================================
  // T5.5 — Create subject with x-school-id=B → correct school_id
  // ==========================================================================
  it('T5.5: POST /subjects with x-school-id=B creates subject with correct school_id', async () => {
    const ts = Date.now()
    const res = await app.inject({
      method: 'POST', url: '/api/v1/subjects',
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { name: 'Biologi B', code: `BIO-B-${ts}`, school_id: schoolBId },
    })
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.payload) as { school_id: number }
    expect(body.school_id).toBe(schoolBId)
  })

  // ==========================================================================
  // T5.6 — PATCH /subjects/:id (School A) with x-school-id=B → 404
  // ==========================================================================
  it('T5.6: PATCH /subjects/:id (School A) with x-school-id=B → 404', async () => {
    const res = await app.inject({
      method: 'PATCH', url: `/api/v1/subjects/${subjectAId}`,
      headers: { authorization: `Bearer ${multiUserToken}`, 'x-school-id': String(schoolBId) },
      payload: { name: 'Diubah (Sabotage)' },
    })
    expect(res.statusCode).toBe(404)
  })
})
