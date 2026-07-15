import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Class API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;
  let ayId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'clsadmin@example.com', password: 'Password123', name: 'Class Admin', role: 'admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Class Test School', code: 'CLSTEST' },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;

    const ayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic-years',
      headers: getAuthHeaders(),
      payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' },
    });
    ayId = (JSON.parse(ayRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /classes ----

  it('GET /api/v1/classes returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/classes' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/classes returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/classes', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/classes filters by grade', async () => {
    await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'X IPA 1', grade: '10' } }),
      app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'XII IPA 1', grade: '12' } }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/classes?grade=10', headers: getAuthHeaders() });
    expect(JSON.parse(res.payload).data).toHaveLength(1);
  });

  it('GET /api/v1/classes filters by academic_year_id', async () => {
    // Create a second ay
    const ay2Res = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2026/2027', start_date: '2026-07-01', end_date: '2027-06-30', semester: 'ganjil' } });
    const ay2Id = (JSON.parse(ay2Res.payload) as { id: number }).id;

    await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'Class AY1', grade: '10' } }),
      app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ay2Id, name: 'Class AY2', grade: '10' } }),
    ]);

    const res = await app.inject({ method: 'GET', url: `/api/v1/classes?academic_year_id=${ayId}`, headers: getAuthHeaders() });
    expect(JSON.parse(res.payload).data).toHaveLength(1);
  });

  // ---- GET /classes/:id ----

  it('GET /api/v1/classes/:id returns class by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'XII-A', grade: '12' } });
    const classId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/classes/${classId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).name).toBe('XII-A');
  });

  it('GET /api/v1/classes/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/classes/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /classes ----

  it('POST /api/v1/classes creates a new class', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'XI-A', grade: '11' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe('XI-A');
    expect(body.grade).toBe('11');
    expect(body.school_id).toBe(schoolId);
    expect(body.academic_year_id).toBe(ayId);
  });

  it('POST /api/v1/classes creates with class_advisor_id', async () => {
    // Setup teacher first
    const userRes = await app.inject({ method: 'POST', url: '/api/v1/users', headers: getAuthHeaders(), payload: { email: `advisor-${Date.now()}@t.com`, password: 'Password123', name: 'Advisor', role: 'teacher', phone: '081234567891' } });
    const userId = (JSON.parse(userRes.payload) as { id: number }).id;

    const teacherRes = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nip: `NIP-${Date.now()}` } });
    const teacherId = (JSON.parse(teacherRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'X-B', grade: '10', class_advisor_id: teacherId } });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).class_advisor_id).toBe(teacherId);
  });

  it('POST /api/v1/classes validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { name: 'Incomplete' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/classes returns 404 for invalid school_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: 99999, academic_year_id: ayId, name: 'NoSchool', grade: '10' } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/classes returns 404 for invalid academic_year_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: 99999, name: 'NoAY', grade: '10' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- PATCH /classes/:id ----

  it('PATCH /api/v1/classes/:id updates a class', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'OldName', grade: '10' } });
    const classId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/classes/${classId}`, headers: getAuthHeaders(), payload: { name: 'NewName' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).name).toBe('NewName');
  });

  it('PATCH /api/v1/classes/:id returns 404 for non-existent class', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/classes/99999', headers: getAuthHeaders(), payload: { name: 'Ghost' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /classes/:id ----

  it('DELETE /api/v1/classes/:id deletes empty class', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'Empty', grade: '10' } });
    const classId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/classes/${classId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE /api/v1/classes/:id returns 409 when class has students', async () => {
    // Create class then assign a student
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/classes', headers: getAuthHeaders(), payload: { school_id: schoolId, academic_year_id: ayId, name: 'WithStudents', grade: '10' } });
    const classId = (JSON.parse(createRes.payload) as { id: number }).id;

    // Create user + student + assign class
    const userRes = await app.inject({ method: 'POST', url: '/api/v1/users', headers: getAuthHeaders(), payload: { email: `studcls-${Date.now()}@s.com`, password: 'Password123', name: 'Student in Class', role: 'student', phone: `081234567${Date.now().toString().slice(-3)}` } });
    const userId = (JSON.parse(userRes.payload) as { id: number }).id;

    await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nis: `NISCLS${Date.now()}` } });

    // Update the student to set class_id
    const knexModule = await import('../src/config/database');
    const knex = knexModule.getKnex();
    await knex('students').where({ user_id: userId }).update({ class_id: classId });

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/classes/${classId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.payload).error).toBe('CLASS_HAS_STUDENTS');
  });

  it('DELETE /api/v1/classes/:id returns 404 for non-existent class', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/classes/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });
});