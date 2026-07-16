import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Submission API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;
  let classId: number;
  let subjectId: number;
  let teacherUserId: number;
  let teacherId: number;
  let academicYearId: number;
  let studentUserId: number;
  let studentId: number;
  let assignmentId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'subadmin@example.com', password: 'Password123', name: 'SUB Admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    // Create school
    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'SUB Test School', code: 'SUBTEST' },
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
    const tUserRes = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
      payload: { email: 'sub.teacher@test.com', password: 'Password123', name: 'Guru SUB', phone: '081234567890' },
    });
    teacherUserId = (JSON.parse(tUserRes.payload) as { id: number }).id;
    const teacherRes = await app.inject({
      method: 'POST',
      url: '/api/v1/teachers',
      headers: getAuthHeaders(),
      payload: { user_id: teacherUserId, school_id: schoolId, nip: '1234567890' },
    });
    teacherId = (JSON.parse(teacherRes.payload) as { id: number }).id;

    // Create student user + student record
    const sUserRes = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
      payload: { email: 'sub.student@test.com', password: 'Password123', name: 'Siswa SUB', phone: '081234567891' },
    });
    studentUserId = (JSON.parse(sUserRes.payload) as { id: number }).id;
    const studentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: getAuthHeaders(),
      payload: { user_id: studentUserId, school_id: schoolId, nis: '9988776655', class_id: classId },
    });
    studentId = (JSON.parse(studentRes.payload) as { id: number }).id;

    // Create assignment
    const asgRes = await app.inject({
      method: 'POST',
      url: '/api/v1/assignments',
      headers: getAuthHeaders(),
      payload: { teacher_id: teacherId, class_id: classId, subject_id: subjectId, academic_year_id: academicYearId, title: 'PR 1', due_date: '2025-07-20T00:00:00Z' },
    });
    assignmentId = (JSON.parse(asgRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /submissions ----

  it('GET /api/v1/submissions returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/submissions' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/submissions returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/submissions', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/submissions filters by assignment_id', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted' } });

    const res = await app.inject({ method: 'GET', url: `/api/v1/submissions?assignment_id=${assignmentId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/submissions filters by student_id', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted' } });

    const res = await app.inject({ method: 'GET', url: `/api/v1/submissions?student_id=${studentId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  // ---- GET /submissions/:id ----

  it('GET /api/v1/submissions/:id returns submission by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted' } });
    const subId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/submissions/${subId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).assignment_id).toBe(assignmentId);
  });

  it('GET /api/v1/submissions/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/submissions/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /submissions ----

  it('POST /api/v1/submissions creates a new submission', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted', comments: 'PR saya' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.assignment_id).toBe(assignmentId);
    expect(body.student_id).toBe(studentId);
    expect(body.status).toBe('submitted');
    expect(body.comments).toBe('PR saya');
  });

  it('POST /api/v1/submissions defaults status to submitted', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId } });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).status).toBe('submitted');
  });

  it('POST /api/v1/submissions validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: {} });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/submissions returns 404 for invalid assignment_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: 99999, student_id: studentId } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/submissions returns 404 for invalid student_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: 99999 } });
    expect(res.statusCode).toBe(404);
  });

  // ---- PATCH /submissions/:id ----

  it('PATCH /api/v1/submissions/:id updates submission score and auto-sets graded_at', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted' } });
    const subId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/submissions/${subId}`, headers: getAuthHeaders(), payload: { score: 85, status: 'graded' } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.score).toBe(85);
    expect(body.status).toBe('graded');
    // Auto-set graded_at when score is provided
    expect(body.graded_at).not.toBeNull();
  });

  it('PATCH /api/v1/submissions/:id updates submission comments', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted' } });
    const subId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/submissions/${subId}`, headers: getAuthHeaders(), payload: { comments: 'Bagus!' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).comments).toBe('Bagus!');
  });

  it('PATCH /api/v1/submissions/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/submissions/99999', headers: getAuthHeaders(), payload: { score: 85 } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /submissions/:id ----

  it('DELETE /api/v1/submissions/:id deletes a submission', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/submissions', headers: getAuthHeaders(), payload: { assignment_id: assignmentId, student_id: studentId, status: 'submitted' } });
    const subId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/submissions/${subId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/submissions/${subId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });

  it('DELETE /api/v1/submissions/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/submissions/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });
});

