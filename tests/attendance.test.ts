import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Attendance API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;
  let classId: number;
  let studentUserId: number;
  let studentId: number;
  let subjectId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'ataadmin@example.com', password: 'Password123', name: 'AT Admin', role: 'admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    // Create school
    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'AT Test School', code: 'ATTEST' },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;

    // Create academic year
    const ayRes = await app.inject({
      method: 'POST',
      url: '/api/v1/academic-years',
      headers: getAuthHeaders(),
      payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' },
    });
    const academicYearId = (JSON.parse(ayRes.payload) as { id: number }).id;

    // Create class
    const classRes = await app.inject({
      method: 'POST',
      url: '/api/v1/classes',
      headers: getAuthHeaders(),
      payload: { school_id: schoolId, academic_year_id: academicYearId, name: 'X IPA 1', grade: '10' },
    });
    classId = (JSON.parse(classRes.payload) as { id: number }).id;

    // Create student user + student record
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
      payload: { email: 'ata.student@test.com', password: 'Password123', name: 'Siswa Test', role: 'student', phone: '081234567890' },
    });
    studentUserId = (JSON.parse(userRes.payload) as { id: number }).id;
    const studentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/students',
      headers: getAuthHeaders(),
      payload: { user_id: studentUserId, school_id: schoolId, nis: '9988776655', class_id: classId },
    });
    studentId = (JSON.parse(studentRes.payload) as { id: number }).id;

    // Create subject
    const subjRes = await app.inject({
      method: 'POST',
      url: '/api/v1/subjects',
      headers: getAuthHeaders(),
      payload: { name: 'Matematika', code: 'MATH', school_id: schoolId },
    });
    subjectId = (JSON.parse(subjRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /attendances ----

  it('GET /api/v1/attendances returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/attendances' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/attendances returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/attendances', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/attendances filters by student_id', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });

    const res = await app.inject({ method: 'GET', url: `/api/v1/attendances?student_id=${studentId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/attendances filters by date range', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });

    const res = await app.inject({ method: 'GET', url: '/api/v1/attendances?date_from=2025-07-01&date_to=2025-07-31', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  // ---- GET /attendances/:id ----

  it('GET /api/v1/attendances/:id returns attendance by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });
    const attId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/attendances/${attId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).student_id).toBe(studentId);
  });

  it('GET /api/v1/attendances/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/attendances/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /attendances ----

  it('POST /api/v1/attendances creates a new attendance record', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.student_id).toBe(studentId);
    expect(body.status).toBe('present');
  });

  it('POST /api/v1/attendances accepts sick status', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'sick' } });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).status).toBe('sick');
  });

  it('POST /api/v1/attendances accepts permission status', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'permission' } });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).status).toBe('permission');
  });

  it('POST /api/v1/attendances validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/attendances returns 404 for invalid student_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: 99999, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/attendances validates status enum', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'invalid_status' } });
    expect(res.statusCode).toBe(400);
  });

  // ---- PATCH /attendances/:id ----

  it('PATCH /api/v1/attendances/:id updates an attendance', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });
    const attId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/attendances/${attId}`, headers: getAuthHeaders(), payload: { status: 'absent' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).status).toBe('absent');
  });

  it('PATCH /api/v1/attendances/:id returns 404 for non-existent', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/attendances/99999', headers: getAuthHeaders(), payload: { status: 'absent' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /attendances/:id ----

  it('DELETE /api/v1/attendances/:id deletes an attendance', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/attendances', headers: getAuthHeaders(), payload: { student_id: studentId, subject_id: subjectId, date: '2025-07-16T08:00:00Z', status: 'present' } });
    const attId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/attendances/${attId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/attendances/${attId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });
});
