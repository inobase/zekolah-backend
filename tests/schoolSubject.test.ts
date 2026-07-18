// =====================================================
// School Subjects — CRUD Tests (Phase 4)
// Tests: school admins can CRUD subjects, scoped to their school.
// =====================================================

import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createTestApp, closeAllApps } from './helper';
import { getKnex } from '../src/config/database';

describe('School Subjects', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  const knex = getKnex();

  const ROLE_IDS: Record<string, number> = {
    super_admin: 1,
    admin: 2,
    teacher: 4,
    student: 5,
  };

  let schoolAdminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let schoolAId: number;
  let schoolBId: number;
  let smkProgramId: number;
  let specializationId: number;
  let subjectId: number;

  const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

  // --- Helpers ---

  async function getSchoolAdminToken(schoolId: number): Promise<string> {
    const email = `sa_${schoolId}_test@zet.com`;
    await knex('user_roles')
      .where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [email]))
      .del();
    await knex('users').where('email', email).del();

    const hash = await bcrypt.hash('Password123', 10);
    const [uid] = await knex('users').insert({
      email,
      password: hash,
      name: `School A Admin Test`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await knex('user_roles').insert({
      user_id: uid,
      role_id: ROLE_IDS.admin,
      school_id: schoolId,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'Password123' },
    });
    return (JSON.parse(res.payload) as { token: string }).token;
  }

  async function getTeacherToken(schoolId: number): Promise<string> {
    const email = `t_${schoolId}_test@zet.com`;
    await knex('user_roles')
      .where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [email]))
      .del();
    await knex('users').where('email', email).del();

    const hash = await bcrypt.hash('Password123', 10);
    const [uid] = await knex('users').insert({
      email,
      password: hash,
      name: `Teacher Test`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await knex('user_roles').insert({
      user_id: uid,
      role_id: ROLE_IDS.teacher,
      school_id: schoolId,
      academic_year_id: null,
      is_active: true,
      granted_at: new Date().toISOString(),
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: 'Password123' },
    });
    return (JSON.parse(res.payload) as { token: string }).token;
  }

  // --- Lifecycle ---

  beforeEach(async () => {
    app = await createTestApp();

    // Create test schools
    const [sA] = await knex('schools').insert({
      name: 'School A Test',
      code: 'SA_TEST',
      email: 'sa@test.com',
      education_level: '3B',
      province: 'Jawa Barat',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    schoolAId = sA as number;

    const [sB] = await knex('schools').insert({
      name: 'School B Test',
      code: 'SB_TEST',
      email: 'sb@test.com',
      education_level: '3B',
      province: 'DKI Jakarta',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    schoolBId = sB as number;

    // Find SMK program (education_level = 3B)
    const programs = await knex('programs').where({ education_level: '3B', is_active: true }).limit(1);
    smkProgramId = (programs[0] as any)?.id;
    expect(smkProgramId).toBeDefined();

    // Activate program for school A (activated_by NULL to avoid FK constraint)
    await knex('school_programs').insert({
      school_id: schoolAId,
      program_id: smkProgramId,
      is_active: true,
      activated_at: new Date(),
      activated_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Find specialization under that program
    const specs = await knex('specializations').where({ program_id: smkProgramId }).limit(1);
    specializationId = (specs[0] as any)?.id;
    expect(specializationId).toBeDefined();

    // Get tokens
    schoolAdminToken = await getSchoolAdminToken(schoolAId);
    teacherToken = await getTeacherToken(schoolAId);
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // ========================================================================
  // CREATE /schools/:schoolId/subjects
  // ========================================================================

  it('POST creates school subject', async () => {
    const payload = {
      specialization_id: specializationId,
      name: 'Matematika RPL',
      code: 'MTP-RPL',
      subject_type: 'DD',
      jp_per_minggu: 4,
      jp_per_semester: 72,
      theory_hours: 2,
      practice_hours: 2,
      customizable: true,
    };

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe(payload.name);
    expect(body.code).toBe(payload.code);
    expect(body.subject_type).toBe('DD');
    expect(body.jp_per_minggu).toBe(4);
    expect(body.school_id).toBe(schoolAId);
    subjectId = body.id;
  });

  it('POST auto-calculates jp_per_semester if not provided', async () => {
    const payload = {
      specialization_id: specializationId,
      name: 'Fisika Dasar',
      code: 'FIS-01',
      subject_type: 'UMUM',
      jp_per_minggu: 3,
    };

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.jp_per_semester).toBe(54); // 3 * 18
  });

  it('POST returns 400 if jp_per_minggu <= 0', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Invalid Subject',
        code: 'INV-01',
        subject_type: 'UMUM',
        jp_per_minggu: 0,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST returns 400 if subject_type is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Bad Type',
        code: 'BT-01',
        subject_type: 'INVALID',
        jp_per_minggu: 2,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST requires authentication', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      payload: {
        specialization_id: specializationId,
        name: 'No Auth',
        code: 'NA-01',
        subject_type: 'UMUM',
        jp_per_minggu: 2,
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ========================================================================
  // LIST GET /schools/:schoolId/subjects
  // ========================================================================

  it('GET lists school subjects with pagination', async () => {
    // Create a couple of subjects first
    await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Bahasa Indonesia',
        code: 'BIND-01',
        subject_type: 'UMUM',
        jp_per_minggu: 4,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolAId}/subjects?page=1&limit=10`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(typeof body.pagination.page).toBe('number');
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET filters by specialization_id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolAId}/subjects?specialization_id=${specializationId}`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    // All returned subjects should match the specialization
    for (const subj of body.data) {
      expect(subj.specialization_id).toBe(specializationId);
    }
  });

  // ========================================================================
  // GET /schools/:schoolId/subjects/:id
  // ========================================================================

  it('GET by ID returns subject', async () => {
    // Create a subject first
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Kimia',
        code: 'KIM-01',
        subject_type: 'DD',
        jp_per_minggu: 3,
      },
    });
    const created = JSON.parse(createRes.payload) as { id: number };

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolAId}/subjects/${created.id}`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(created.id);
    expect(body.name).toBe('Kimia');
  });

  it('GET by ID returns 404 for non-existent subject', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolAId}/subjects/99999`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(404);
  });

  // ========================================================================
  // PATCH /schools/:schoolId/subjects/:id
  // ========================================================================

  it('PATCH updates school subject', async () => {
    // Create first
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Old Name',
        code: 'OLD-01',
        subject_type: 'UMUM',
        jp_per_minggu: 2,
      },
    });
    const created = JSON.parse(createRes.payload) as { id: number };

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schools/${schoolAId}/subjects/${created.id}`,
      headers: authHeader(schoolAdminToken),
      payload: { name: 'New Name', jp_per_minggu: 5 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe('New Name');
    expect(body.jp_per_minggu).toBe(5);
    expect(body.jp_per_semester).toBe(90); // auto-recalc: 5 * 18
  });

  it('PATCH updates jp_per_semester when jp_per_minggu changes', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Test Subject',
        code: 'TS-01',
        subject_type: 'DD',
        jp_per_minggu: 3,
        jp_per_semester: 54,
      },
    });
    const created = JSON.parse(createRes.payload) as { id: number };

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schools/${schoolAId}/subjects/${created.id}`,
      headers: authHeader(schoolAdminToken),
      payload: { jp_per_minggu: 6 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.jp_per_semester).toBe(108); // 6 * 18
  });

  // ========================================================================
  // DELETE /schools/:schoolId/subjects/:id
  // ========================================================================

  it('DELETE deletes school subject', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'To Delete',
        code: 'TD-01',
        subject_type: 'UMUM',
        jp_per_minggu: 2,
      },
    });
    const created = JSON.parse(createRes.payload) as { id: number };

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/schools/${schoolAId}/subjects/${created.id}`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(204);

    // Verify deleted
    const verify = await knex('school_subjects').where({ id: created.id }).first();
    expect(verify).toBeFalsy();
  });

  // ========================================================================
  // LIST BY SPECIALIZATION
  // ========================================================================

  it('GET /schools/:schoolId/specializations/:specId/subjects returns subjects', async () => {
    // Create a subject
    await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'RPL Subject',
        code: 'RPL-01',
        subject_type: 'DD',
        jp_per_minggu: 4,
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolAId}/specializations/${specializationId}/subjects`,
      headers: authHeader(schoolAdminToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  // ========================================================================
  // ACCESS CONTROL
  // ========================================================================

  it('Cross-school: School B cannot see School A subjects', async () => {
    // Create a subject for school A
    await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/subjects`,
      headers: authHeader(schoolAdminToken),
      payload: {
        specialization_id: specializationId,
        name: 'Secret Subject',
        code: 'SEC-01',
        subject_type: 'UMUM',
        jp_per_minggu: 2,
      },
    });

    // Get school B admin token
    const schoolBToken = await getSchoolAdminToken(schoolBId);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolBId}/subjects`,
      headers: authHeader(schoolBToken),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.length).toBe(0);
  });

  it('GET lists without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolAId}/subjects`,
    });

    expect(res.statusCode).toBe(401);
  });
});
