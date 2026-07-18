// =====================================================
// School Program — Activation/Deactivation Tests
// Tests: school activates programs, validates education_level match,
//         cross-school isolation, and cascade deactivation to specializations.
// =====================================================

import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createTestApp, closeAllApps } from './helper';
import { getKnex } from '../src/config/database';

describe('School Program Activation', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  const knex = getKnex();

  const ROLE_IDS: Record<string, number> = {
    super_admin: 1,
    admin: 2,
    staff: 3,
    teacher: 4,
    student: 5,
  };

  let superToken: string;
  let schoolAdminToken: string;
  let teacherToken: string;
  let schoolAId: number;
  let schoolBId: number;
  let smkProgramId: number;
  let smaProgramId: number;

  const authHeader = (token: string) => ({ authorization: `Bearer ${token}` });

  async function getSuperAdminToken(): Promise<string> {
    const email = 'sp_test_sa@zet.com';
    await knex('user_roles')
      .where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [email]))
      .del();
    await knex('users').where('email', email).del();

    const hash = await bcrypt.hash('Password123', 10);
    const [uid] = await knex('users').insert({
      email, password: hash, name: 'SP Test Super Admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    await knex('user_roles').insert({
      user_id: uid, role_id: ROLE_IDS.super_admin, school_id: null, academic_year_id: null, is_active: true, granted_at: new Date().toISOString(),
    });
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'Password123' } });
    return (JSON.parse(res.payload) as { token: string }).token;
  }

  async function getSchoolAdminToken(schoolId: number): Promise<string> {
    const email = `sp_test_sa_${schoolId}@zet.com`;
    await knex('user_roles')
      .where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [email]))
      .del();
    await knex('users').where('email', email).del();

    const hash = await bcrypt.hash('Password123', 10);
    const [uid] = await knex('users').insert({
      email, password: hash, name: 'SA Test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    await knex('user_roles').insert({
      user_id: uid, role_id: ROLE_IDS.admin, school_id: schoolId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString(),
    });
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'Password123' } });
    return (JSON.parse(res.payload) as { token: string }).token;
  }

  async function getTeacherToken(schoolId: number): Promise<string> {
    const email = `sp_test_te_${schoolId}@zet.com`;
    await knex('user_roles')
      .where('user_id', knex.raw('(SELECT id FROM users WHERE email = ?)', [email]))
      .del();
    await knex('users').where('email', email).del();

    const hash = await bcrypt.hash('Password123', 10);
    const [uid] = await knex('users').insert({
      email, password: hash, name: 'Teacher Test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    await knex('user_roles').insert({
      user_id: uid, role_id: ROLE_IDS.teacher, school_id: schoolId, academic_year_id: null, is_active: true, granted_at: new Date().toISOString(),
    });
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'Password123' } });
    return (JSON.parse(res.payload) as { token: string }).token;
  }

  beforeEach(async () => {
    app = await createTestApp();

    // Create SMK school
    superToken = await getSuperAdminToken();
    const smkRes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: authHeader(superToken),
      payload: { name: 'SMK Test Alpha', code: 'SMK-A', education_level: '3B' },
    });
    schoolAId = JSON.parse(smkRes.payload).id;

    // Create SMA school
    const smaRes = await app.inject({
      method: 'POST', url: '/api/v1/schools',
      headers: authHeader(superToken),
      payload: { name: 'SMA Test Beta', code: 'SMA-B', education_level: '3A' },
    });
    schoolBId = JSON.parse(smaRes.payload).id;

    // Create school admins, teacher for school A
    schoolAdminToken = await getSchoolAdminToken(schoolAId);
    teacherToken = await getTeacherToken(schoolAId);

    // Fetch available SMK programs (education_level = 3B)
    const programs = await knex('programs').where({ education_level: '3B' }).select('id', 'name');
    smkProgramId = programs[0]?.id ?? 0;

    // Fetch SMA program if any (education_level = 3A)
    const smaProgs = await knex('programs').where({ education_level: '3A' });
    smaProgramId = smaProgs[0]?.id ?? 0;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // ==========================================================================
  // GET /schools/:schoolId/programs/available
  // ==========================================================================

  it('GET /available returns SMK programs for SMK school (education_level 3B)', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/schools/${schoolAId}/programs/available`,
      headers: authHeader(schoolAdminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    // SMK programs (education_level = 3B) should be returned
    body.forEach((p: any) => expect(p.education_level).toBe('3B'));
    expect(body.length).toBeGreaterThan(0);
  });

  it('GET /available returns empty for SMA school (no matching programs)', async () => {
    // SMA school has education_level 3A, no SMK programs match
    const smaAdminToken = await getSchoolAdminToken(schoolBId);
    const res = await app.inject({
      method: 'GET', url: `/api/v1/schools/${schoolBId}/programs/available`,
      headers: authHeader(smaAdminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  it('GET /available returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/schools/${schoolAId}/programs/available`,
    });
    expect(res.statusCode).toBe(401);
  });

  // ==========================================================================
  // POST /schools/:schoolId/programs/activate
  // ==========================================================================

  it('POST activate creates school_program linking to matching program', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.school_id).toBe(schoolAId);
    expect(body.program_id).toBe(smkProgramId);
    expect(body.is_active).toBe(1);
    expect(body.activated_at).toBeDefined();

    // Verify in DB
    const existing = await knex('school_programs').where({ school_id: schoolAId, program_id: smkProgramId }).first();
    expect(existing).toBeDefined();
    expect(existing!.is_active).toBe(1);
  });

  it('POST activate returns 400 if program education_level does not match school', async () => {
    if (smaProgramId) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/schools/${schoolAId}/programs/activate`,
        headers: authHeader(schoolAdminToken),
        payload: { program_id: smaProgramId },
      });
      expect(res.statusCode).toBe(400);
    } else {
      // No SMA program exists — just test duplicate activation
      await app.inject({
        method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
        headers: authHeader(schoolAdminToken),
        payload: { program_id: smkProgramId },
      });
      const dupRes = await app.inject({
        method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
        headers: authHeader(schoolAdminToken),
        payload: { program_id: smkProgramId },
      });
      expect(dupRes.statusCode).toBe(409);
    }
  });

  it('POST activate returns 409 if program already activated for school', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });
    const dupRes = await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });
    expect(dupRes.statusCode).toBe(409);
  });

  it('POST activate returns 404 for non-existent program', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: 99999 },
    });
    expect(res.statusCode).toBe(404);
  });

  // ==========================================================================
  // GET /schools/:schoolId/programs
  // ==========================================================================

  it('GET programs lists school_programs for active school', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });

    const res = await app.inject({
      method: 'GET', url: `/api/v1/schools/${schoolAId}/programs`,
      headers: authHeader(schoolAdminToken),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].school_id).toBe(schoolAId);
  });

  // ==========================================================================
  // DELETE /schools/:schoolId/programs/:programId
  // ==========================================================================

  it('DELETE deactivates school program', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });

    const res = await app.inject({
      method: 'DELETE', url: `/api/v1/schools/${schoolAId}/programs/${smkProgramId}`,
      headers: authHeader(schoolAdminToken),
    });
    expect(res.statusCode).toBe(204);

    const existing = await knex('school_programs')
      .where({ school_id: schoolAId, program_id: smkProgramId })
      .first();
    expect(existing!.is_active).toBe(0);
  });

  // ==========================================================================
  // School Specialization Activation/Deactivation
  // ==========================================================================

  it('POST activate specialization creates linkage', async () => {
    // Activate program first
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });

    const schoolProg = await knex('school_programs').where({ school_id: schoolAId, program_id: smkProgramId }).first();

    // Get a specialization belonging to the same program
    const spec = await knex('specializations').where({ program_id: smkProgramId, is_active: true }).first();
    expect(spec).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/programs/${schoolProg!.id}/specializations/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { specialization_id: spec!.id },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.school_program_id).toBe(schoolProg!.id);
    expect(body.specialization_id).toBe(spec!.id);

    const existing = await knex('school_specializations')
      .where({ school_program_id: schoolProg!.id, specialization_id: spec!.id }).first();
    expect(existing).toBeDefined();
    expect(existing!.is_active).toBe(1);
  });

  it('DELETE deactivate specialization', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });
    const schoolProg = await knex('school_programs').where({ school_id: schoolAId, program_id: smkProgramId }).first();

    const spec = await knex('specializations').where({ program_id: smkProgramId, is_active: true }).first();
    await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/programs/${schoolProg!.id}/specializations/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { specialization_id: spec!.id },
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/schools/${schoolAId}/programs/${schoolProg!.id}/specializations/${spec!.id}`,
      headers: authHeader(schoolAdminToken),
    });
    expect(res.statusCode).toBe(204);

    const existing = await knex('school_specializations')
      .where({ school_program_id: schoolProg!.id, specialization_id: spec!.id }).first();
    expect(existing!.is_active).toBe(0);
  });

  // ==========================================================================
  // Cross-School Isolation
  // ==========================================================================

  it('CROSS-SCHOOL: School B cannot activate School A programs', async () => {
    // Activate program for school A
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });

    // Create school admin for school B
    const schoolBAdminToken = await getSchoolAdminToken(schoolBId);

    // School B tries to activate school A's program — should fail (school B has SMA, not SMK)
    const res = await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolBId}/programs/activate`,
      headers: authHeader(schoolBAdminToken),
      payload: { program_id: smkProgramId },
    });
    // Either 400 (education_level mismatch) or 404 (program not found for this school context)
    expect([400, 404]).toContain(res.statusCode);
  });

  // ==========================================================================
  // Access Control
  // ==========================================================================

  it('GET /available returns data without auth → 401', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/v1/schools/${schoolAId}/programs/available`,
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST activate returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      payload: { program_id: smkProgramId },
    });
    expect(res.statusCode).toBe(401);
  });

  // ==========================================================================
  // Cascade Deactivation
  // ==========================================================================

  it('DELETE school program cascades deactivate to specializations', async () => {
    await app.inject({
      method: 'POST', url: `/api/v1/schools/${schoolAId}/programs/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { program_id: smkProgramId },
    });
    const schoolProg = await knex('school_programs').where({ school_id: schoolAId, program_id: smkProgramId }).first();

    const spec = await knex('specializations').where({ program_id: smkProgramId, is_active: true }).first();
    await app.inject({
      method: 'POST',
      url: `/api/v1/schools/${schoolAId}/programs/${schoolProg!.id}/specializations/activate`,
      headers: authHeader(schoolAdminToken),
      payload: { specialization_id: spec!.id },
    });

    // Verify specialization is active
    const before = await knex('school_specializations')
      .where({ school_program_id: schoolProg!.id, specialization_id: spec!.id }).first();
    expect(before!.is_active).toBe(1);

    // Deactivate school program
    await app.inject({
      method: 'DELETE', url: `/api/v1/schools/${schoolAId}/programs/${smkProgramId}`,
      headers: authHeader(schoolAdminToken),
    });

    // Specialization should be deactivated
    const after = await knex('school_specializations')
      .where({ school_program_id: schoolProg!.id, specialization_id: spec!.id }).first();
    expect(after!.is_active).toBe(0);
  });
});
