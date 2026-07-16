import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('TeachingAssignment API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;
  let classId: number;
  let subjectId: number;
  let teacherId: number;
  let academicYearId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'taadmin@example.com', password: 'Password123', name: 'TA Admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    // Create school
    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'TA Test School', code: 'TATEST' },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;

    // Create academic year
    const ayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic-years',
      headers: getAuthHeaders(),
      payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' },
    });
    academicYearId = (JSON.parse(ayRes.payload) as { id: number }).id;

    // Create class
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: getAuthHeaders(),
      payload: { school_id: schoolId, academic_year_id: academicYearId, name: 'X IPA 1', grade: '10' },
    });
    classId = (JSON.parse(classRes.payload) as { id: number }).id;

    // Create subject
    const subjRes = await app.inject({
      method: 'POST',
      url: '/api/v1/subjects',
      headers: getAuthHeaders(),
      payload: { name: 'Matematika', code: 'MATH', school_id: schoolId },
    });
    subjectId = (JSON.parse(subjRes.payload) as { id: number }).id;

    // Create teacher user + teacher record
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
      payload: { email: 'ta.teacher@test.com', password: 'Password123', name: 'Guru TA', phone: '081234567890' },
    });
    const userId = (JSON.parse(userRes.payload) as { id: number }).id;
    const teacherRes = await app.inject({
      method: 'POST',
      url: '/api/v1/teachers',
      headers: getAuthHeaders(),
      payload: { user_id: userId, school_id: schoolId, nip: '1234567890' },
    });
    teacherId = (JSON.parse(teacherRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /teaching-assignments ----

  it('GET /api/v1/teaching-assignments returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/teaching-assignments' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/teaching-assignments returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/teaching-assignments', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/teaching-assignments filters by teacher_id', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });

    const res = await app.inject({ method: 'GET', url: `/api/v1/teaching-assignments?teacher_id=${teacherId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/teaching-assignments filters by class_id', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });

    const res = await app.inject({ method: 'GET', url: `/api/v1/teaching-assignments?class_id=${classId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  // ---- GET /teaching-assignments/:id ----

  it('GET /api/v1/teaching-assignments/:id returns teaching assignment by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    const taId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/teaching-assignments/${taId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).teacher_id).toBe(teacherId);
  });

  it('GET /api/v1/teaching-assignments/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/teaching-assignments/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /teaching-assignments ----

  it('POST /api/v1/teaching-assignments creates a new teaching assignment', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.teacher_id).toBe(teacherId);
    expect(body.class_id).toBe(classId);
    expect(body.subject_id).toBe(subjectId);
    expect(body.academic_year_id).toBe(academicYearId);
  });

  it('POST /api/v1/teaching-assignments validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/teaching-assignments returns 404 for invalid teacher_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: 99999, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/teaching-assignments returns 404 for invalid class_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: 99999, subject_id: subjectId, academic_year_id: academicYearId } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/teaching-assignments returns 409 for duplicate assignment', async () => {
    const payload = { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId };
    await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload });
    const res = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload });
    expect(res.statusCode).toBe(409);
  });

  // ---- PATCH /teaching-assignments/:id ----

  it('PATCH /api/v1/teaching-assignments/:id updates a teaching assignment', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    const taId = (JSON.parse(createRes.payload) as { id: number }).id;

    // Update to a new subject
    const subjRes = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Fisika', code: 'PHYS', school_id: schoolId } });
    const newSubjectId = (JSON.parse(subjRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/teaching-assignments/${taId}`, headers: getAuthHeaders(), payload: { subject_id: newSubjectId } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).subject_id).toBe(newSubjectId);
  });

  it('PATCH /api/v1/teaching-assignments/:id validates at least one field', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    const taId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/teaching-assignments/${taId}`, headers: getAuthHeaders(), payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /api/v1/teaching-assignments/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/teaching-assignments/99999', headers: getAuthHeaders(), payload: { subject_id: subjectId } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /teaching-assignments/:id ----

  it('DELETE /api/v1/teaching-assignments/:id deletes a teaching assignment', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teaching-assignments', headers: getAuthHeaders(), payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId } });
    const taId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/teaching-assignments/${taId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/teaching-assignments/${taId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });

  it('DELETE /api/v1/teaching-assignments/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/teaching-assignments/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });
});

