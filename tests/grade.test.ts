import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Grade API', () => {
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

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'grdadmin@example.com', password: 'Password123', name: 'GRD Admin', role: 'admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    // Create school
    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'GRD Test School', code: 'GRDTEST' },
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
      payload: { email: 'grd.teacher@test.com', password: 'Password123', name: 'Guru GRD', role: 'teacher', phone: '081234567890' },
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
      payload: { email: 'grd.student@test.com', password: 'Password123', name: 'Siswa GRD', role: 'student', phone: '081234567891' },
    });
    studentUserId = (JSON.parse(sUserRes.payload) as { id: number }).id;
    const studentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: getAuthHeaders(),
      payload: { user_id: studentUserId, school_id: schoolId, nis: '9988776655', class_id: classId },
    });
    studentId = (JSON.parse(studentRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /grades ----

  it('GET /api/v1/grades returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/grades' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/grades returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/grades', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/grades filters by student_id', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });

    const res = await app.inject({ method: 'GET', url: `/api/v1/grades?student_id=${studentId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/grades filters by assessment_type', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'midterm', score: 85, teacher_id: teacherId } });

    const res = await app.inject({ method: 'GET', url: '/api/v1/grades?assessment_type=daily', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  // ---- GET /grades/:id ----

  it('GET /api/v1/grades/:id returns grade by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    const gradeId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/grades/${gradeId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).student_id).toBe(studentId);
  });

  it('GET /api/v1/grades/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/grades/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /grades ----

  it('POST /api/v1/grades creates a new grade', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.student_id).toBe(studentId);
    expect(body.score).toBe(80);
    expect(body.assessment_type).toBe('daily');
  });

  it('POST /api/v1/grades defaults max_score to 100', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).max_score).toBe(100);
  });

  it('POST /api/v1/grades supports all assessment types', async () => {
    const types: Array<'daily' | 'midterm' | 'final' | 'project' | 'quiz' | 'exam'> = ['daily', 'midterm', 'final', 'project', 'quiz', 'exam'];
    for (const type of types) {
      const res = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: type, score: 80, teacher_id: teacherId } });
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.payload).assessment_type).toBe(type);
    }
  });

  it('POST /api/v1/grades validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/grades returns 404 for invalid student_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: 99999, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/grades returns 404 for invalid teacher_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: 99999 } });
    expect(res.statusCode).toBe(404);
  });

  // ---- PATCH /grades/:id ----

  it('PATCH /api/v1/grades/:id updates a grade', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    const gradeId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/grades/${gradeId}`, headers: getAuthHeaders(), payload: { score: 85 } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).score).toBe(85);
  });

  it('PATCH /api/v1/grades/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/grades/99999', headers: getAuthHeaders(), payload: { score: 85 } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /grades/:id ----

  it('DELETE /api/v1/grades/:id deletes a grade', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/grades', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, academic_year_id: academicYearId, assessment_type: 'daily', score: 80, teacher_id: teacherId } });
    const gradeId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/grades/${gradeId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/grades/${gradeId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });

  it('DELETE /api/v1/grades/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/grades/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });
});
