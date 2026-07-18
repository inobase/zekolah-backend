import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestApp, closeAllApps } from './helper'
import { getKnex } from '../src/config/database'
import bcrypt from 'bcryptjs'

/**
 * Multi-Role Submission Module Tests (Phase 8)
 *
 * Verifies that assignments and submissions are properly scoped to schools.
 *
 * Scoping chains:
 *   - Assignments: filtered via class_id → classes.school_id
 *   - Submissions: filtered via student_id → students.school_id OR assignment_id → class → school
 *
 * We build fixtures via DB inserts for efficiency:
 *   School → AcademicYear → Teacher → Class → Subject → Student → Assignment → Submission
 */

const ROLE_IDS: Record<string, number> = {
  super_admin: 1,
  admin: 2,
  staff: 3,
  teacher: 4,
  student: 5,
}

describe('Multi-Role Submission Module', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>
  const knex = getKnex()

  let multiUserToken: string
  let superAdminUserId: number
  let schoolAId: number
  let schoolBId: number
  let classAId: number
  let classBId: number
  let teacherAAId: number // teacher in school A
  let teacherBAId: number // teacher in school B
  let studentAId: number // student in school A
  let studentBId: number // student in school B
  let assignmentAId: number
  let assignmentBId: number
  let submissionAId: number
  let submissionBId: number
  let academicYearAId: number
  let academicYearBId: number

  async function getSuperAdminToken(): Promise<string> {
    const knex = getKnex()
    const uniqueEmail = `initadmin_sub_${Date.now()}@test.com`
    const hash = await bcrypt.hash('Test123!', 10)
    const existing = await knex('users').where({ email: uniqueEmail }).first()
    if (existing) {
      await knex('users').where({ email: uniqueEmail }).del()
      await knex('user_roles').where({ user_id: existing.id }).del()
    }
    const [uid] = await knex('users').insert({
      email: uniqueEmail, password: hash, name: 'Init Admin Sub',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    superAdminUserId = uid
    await knex('user_roles').insert({
      user_id: uid, role_id: ROLE_IDS.super_admin, school_id: null, academic_year_id: null,
      is_active: true, granted_at: new Date().toISOString(),
    })
    const loginRes = await app.inject({
      method: 'POST', url: '/api/v1/auth/login',
      payload: { email: uniqueEmail, password: 'Test123!' },
    })
    return (JSON.parse(loginRes.payload) as { token: string }).token
  }

  beforeEach(async () => {
    app = await createTestApp()
    const now = new Date().toISOString()

    // Login as init super admin (user_id = 1, seeded)
    multiUserToken = await getSuperAdminToken()

    // Remove any existing roles for the init user so we can set them fresh
    await knex('user_roles').where('user_id', 1).del()

    // --- Create 2 schools ---
    const [schoolARes, schoolBRes] = await Promise.all([
      app.inject({
        method: 'POST', url: '/api/v1/schools',
        headers: { authorization: `Bearer ${multiUserToken}` },
        payload: { name: 'School Alpha', code: 'SA' },
      }),
      app.inject({
        method: 'POST', url: '/api/v1/schools',
        headers: { authorization: `Bearer ${multiUserToken}` },
        payload: { name: 'School Beta', code: 'SB' },
      }),
    ])
    schoolAId = (JSON.parse(schoolARes.payload) as { id: number }).id
    schoolBId = (JSON.parse(schoolBRes.payload) as { id: number }).id

    // --- Academic years ---
    const [ayARow, ayBRow] = await Promise.all([
      knex('academic_years').insert({
        school_id: schoolAId, year: '2025/2026', semester: 'ganjil',
        start_date: '2025-07-01', end_date: '2026-06-30',
        created_at: now, updated_at: now,
      }),
      knex('academic_years').insert({
        school_id: schoolBId, year: '2025/2026', semester: 'ganjil',
        start_date: '2025-07-01', end_date: '2026-06-30',
        created_at: now, updated_at: now,
      }),
    ])
    academicYearAId = Array.isArray(ayARow) ? Number(ayARow[0]) : Number(ayARow)
    academicYearBId = Array.isArray(ayBRow) ? Number(ayBRow[0]) : Number(ayBRow)

    // --- Users + Teachers ---
    const [teacherAUser, teacherBUser] = await Promise.all([
      knex('users').insert({
        email: `teacher-a-${Date.now()}@test.com`,
        password: 'bcypt$hash', name: 'Teacher Alpha',
        created_at: now, updated_at: now,
      }),
      knex('users').insert({
        email: `teacher-b-${Date.now()}@test.com`,
        password: 'bcypt$hash', name: 'Teacher Beta',
        created_at: now, updated_at: now,
      }),
    ])
    const teaUserId = Array.isArray(teacherAUser) ? Number(teacherAUser[0]) : Number(teacherAUser)
    const tbUserId = Array.isArray(teacherBUser) ? Number(teacherBUser[0]) : Number(teacherBUser)

    const [teaRow, tbRow] = await Promise.all([
      knex('teachers').insert({
        user_id: teaUserId, school_id: schoolAId,
        nip: '100200300400',
        created_at: now, updated_at: now,
      }),
      knex('teachers').insert({
        user_id: tbUserId, school_id: schoolBId,
        nip: '500600700800',
        created_at: now, updated_at: now,
      }),
    ])
    teacherAAId = Array.isArray(teaRow) ? Number(teaRow[0]) : Number(teaRow)
    teacherBAId = Array.isArray(tbRow) ? Number(tbRow[0]) : Number(tbRow)

    // --- Classes ---
    const [cARow, cBRow] = await Promise.all([
      knex('classes').insert({
        name: '10-A Alpha', grade: '10', vacancy: 36,
        academic_year_id: academicYearAId, school_id: schoolAId,
        class_advisor_id: teacherAAId,
        created_at: now, updated_at: now,
      }),
      knex('classes').insert({
        name: '10-B Beta', grade: '10', vacancy: 36,
        academic_year_id: academicYearBId, school_id: schoolBId,
        class_advisor_id: teacherBAId,
        created_at: now, updated_at: now,
      }),
    ])
    classAId = Array.isArray(cARow) ? Number(cARow[0]) : Number(cARow)
    classBId = Array.isArray(cBRow) ? Number(cBRow[0]) : Number(cBRow)

    // --- Subjects (one per school) ---
    const [subjARow, subjBRow] = await Promise.all([
      knex('subjects').insert({
        name: 'Mathematics', code: 'MATH',
        school_id: schoolAId,
        created_at: now, updated_at: now,
      }),
      knex('subjects').insert({
        name: 'Mathematics', code: 'MATH',
        school_id: schoolBId,
        created_at: now, updated_at: now,
      }),
    ])
    const subjectAId = Array.isArray(subjARow) ? Number(subjARow[0]) : Number(subjARow)
    const subjectBId = Array.isArray(subjBRow) ? Number(subjBRow[0]) : Number(subjBRow)

    // --- Students ---
    const [sAUser, sBUser] = await Promise.all([
      knex('users').insert({
        email: `student-a-${Date.now()}@test.com`,
        password: 'bcypt$hash', name: 'Student Alpha',
        created_at: now, updated_at: now,
      }),
      knex('users').insert({
        email: `student-b-${Date.now()}@test.com`,
        password: 'bcypt$hash', name: 'Student Beta',
        created_at: now, updated_at: now,
      }),
    ])
    const saUserId = Array.isArray(sAUser) ? Number(sAUser[0]) : Number(sAUser)
    const sbUserId = Array.isArray(sBUser) ? Number(sBUser[0]) : Number(sBUser)

    const [sARow, sBRow] = await Promise.all([
      knex('students').insert({
        user_id: saUserId, school_id: schoolAId,
        nis: '0102030401', nisn: '9102030401',
        gender: 'L', parent_name: 'Parent Alpha',
        created_at: now, updated_at: now,
      }),
      knex('students').insert({
        user_id: sbUserId, school_id: schoolBId,
        nis: '0506070801', nisn: '6506070801',
        gender: 'P', parent_name: 'Parent Beta',
        created_at: now, updated_at: now,
      }),
    ])
    studentAId = Array.isArray(sARow) ? Number(sARow[0]) : Number(sARow)
    studentBId = Array.isArray(sBRow) ? Number(sBRow[0]) : Number(sBRow)

    // Assign multi-role teacher roles
    await knex('user_roles').insert([
      { user_id: superAdminUserId, role_id: ROLE_IDS.teacher, school_id: schoolAId, academic_year_id: null, is_active: true, granted_at: now },
      { user_id: superAdminUserId, role_id: ROLE_IDS.teacher, school_id: schoolBId, academic_year_id: null, is_active: true, granted_at: now },
    ])

    // --- Assignments ---
    const [aaRow, abRow] = await Promise.all([
      knex('assignments').insert({
        class_id: classAId, subject_id: subjectAId,
        teacher_id: teacherAAId, academic_year_id: academicYearAId,
        title: 'Essay Alpha', description: 'Write an essay',
        due_date: '2025-12-01T23:59:59.000Z', max_score: 100,
        created_at: now, updated_at: now,
      }),
      knex('assignments').insert({
        class_id: classBId, subject_id: subjectBId,
        teacher_id: teacherBAId, academic_year_id: academicYearBId,
        title: 'Essay Beta', description: 'Write an essay',
        due_date: '2025-12-01T23:59:59.000Z', max_score: 100,
        created_at: now, updated_at: now,
      }),
    ])
    assignmentAId = Array.isArray(aaRow) ? Number(aaRow[0]) : Number(aaRow)
    assignmentBId = Array.isArray(abRow) ? Number(abRow[0]) : Number(abRow)
  })

  afterEach(async () => {
    await closeAllApps()
  })

  // ==================== Tests ====================

  it('T8.1: GET /assignments returns data scoped to x-school-id via class', async () => {
    const token = await getSuperAdminToken()

    // Request assignments for School A
    const respA = await app.inject({
      method: 'GET',
      url: '/api/v1/assignments',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })
    expect(respA.statusCode).toBe(200)
    const bodyA = JSON.parse(respA.payload) as { data: { id: number; title: string; school_id?: number }[] }
    expect(bodyA.data.length).toBeGreaterThan(0)
    // Assignments should have been filtered by school scope

    // Request assignments for School B
    const respB = await app.inject({
      method: 'GET',
      url: '/api/v1/assignments',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })
    expect(respB.statusCode).toBe(200)
    const bodyB = JSON.parse(respB.payload) as { data: { id: number }[] }
    expect(bodyB.data.length).toBeGreaterThan(0)
  })

  it('T8.2: GET /assignments/:id returns 404 for assignment in another school', async () => {
    const token = await getSuperAdminToken()

    // Assignment A is scoped to School A
    // Accessing it with School B scope should return 404.
    const resp = await app.inject({
      method: 'GET',
      url: `/api/v1/assignments/${assignmentAId}`,
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })
    expect(resp.statusCode).toBe(404)
  })

  it('T8.3: GET /submissions returns data scoped to x-school-id via student', async () => {
    const token = await getSuperAdminToken()

    // Create a submission in School A
    const [subARow] = await knex('submissions').insert({
      assignment_id: assignmentAId, student_id: studentAId,
      status: 'submitted', score: null, comments: 'Good work',
      submitted_at: new Date('2025-11-15T10:00:00Z').toISOString(),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    submissionAId = Array.isArray(subARow) ? Number(subARow[0]) : Number(subARow)

    // Request submissions for School A — should include our submission
    const respA = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })
    expect(respA.statusCode).toBe(200)
    const bodyA = JSON.parse(respA.payload) as { data: { id: number; student_id: number }[] }
    expect(bodyA.data.some((s) => s.id === submissionAId)).toBe(true)

    // Request submissions for School B — should NOT include School A's submission
    const respB = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })
    expect(respB.statusCode).toBe(200)
    const bodyB = JSON.parse(respB.payload) as { data: { id: number }[] }
    expect(bodyB.data.some((s) => s.id === submissionAId)).toBe(false)
  })

  it('T8.4: Creating a submission respects school scope', async () => {
    // Create a submission via API in School A context
    const token = await getSuperAdminToken()

    const createResp = await app.inject({
      method: 'POST',
      url: '/api/v1/submissions',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
      payload: {
        assignment_id: assignmentAId,
        student_id: studentAId,
        status: 'submitted',
        comments: 'Initial submission',
      },
    })
    expect(createResp.statusCode).toBe(201)

    const created = JSON.parse(createResp.payload) as { id: number }
    submissionAId = created.id

    // Verify it was created correctly
    const resp = await app.inject({
      method: 'GET',
      url: `/api/v1/submissions/${submissionAId}`,
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })
    expect(resp.statusCode).toBe(200)
  })

  it('T8.5: Submissions are properly isolated between schools', async () => {
    const token = await getSuperAdminToken()
    const now = new Date().toISOString()

    // Create submissions in both schools
    const [subARow, subBRow] = await Promise.all([
      knex('submissions').insert({
        assignment_id: assignmentAId, student_id: studentAId,
        status: 'submitted', score: 70, comments: 'School A sub',
        submitted_at: new Date('2025-11-15T10:00:00Z').toISOString(),
        created_at: now, updated_at: now,
      }),
      knex('submissions').insert({
        assignment_id: assignmentBId, student_id: studentBId,
        status: 'submitted', score: 85, comments: 'School B sub',
        submitted_at: new Date('2025-11-15T10:00:00Z').toISOString(),
        created_at: now, updated_at: now,
      }),
    ])
    submissionAId = Array.isArray(subARow) ? Number(subARow[0]) : Number(subARow)
    submissionBId = Array.isArray(subBRow) ? Number(subBRow[0]) : Number(subBRow)

    // Fetch submissions for School A
    const respA = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolAId) },
    })
    expect(respA.statusCode).toBe(200)
    const bodyA = JSON.parse(respA.payload) as { data: { id: number }[] }
    const idsA = bodyA.data.map((s) => s.id)
    expect(idsA.includes(submissionAId)).toBe(true)
    expect(idsA.includes(submissionBId)).toBe(false)

    // Fetch submissions for School B
    const respB = await app.inject({
      method: 'GET',
      url: '/api/v1/submissions',
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })
    expect(respB.statusCode).toBe(200)
    const bodyB = JSON.parse(respB.payload) as { data: { id: number }[] }
    const idsB = bodyB.data.map((s) => s.id)
    expect(idsB.includes(submissionBId)).toBe(true)
    expect(idsB.includes(submissionAId)).toBe(false)
  })

  it('T8.6: Accessing another school\'s submission returns 404', async () => {
    const token = await getSuperAdminToken()

    // Submission A belongs to School A. Accessing it with School B scope should return 404.
    const resp = await app.inject({
      method: 'GET',
      url: `/api/v1/submissions/${submissionAId}`,
      headers: { authorization: `Bearer ${token}`, 'x-school-id': String(schoolBId) },
    })
    expect(resp.statusCode).toBe(404)
  })
})

