import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Student API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'stdadmin@example.com', password: 'Password123', name: 'Student Admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Student Test School', code: 'STDTEST' },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;

    // Create a user for student FK
    await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
      payload: { email: 'student@test.com', password: 'Password123', name: 'Siswa Test', phone: '081234567890' },
    });
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /students ----

  it('GET /api/v1/students returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/students' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/students returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/students', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/students respects pagination', async () => {
    const userIds = await Promise.all([1, 2, 3, 4, 5].map((i) => ensureStudentUser(app, getAuthHeaders(), i)));
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userIds[i], school_id: schoolId, nis: `NIS00${i + 1}` } });
    }

    const res = await app.inject({ method: 'GET', url: '/api/v1/students?page=1&limit=2', headers: getAuthHeaders() });
    const body = JSON.parse(res.payload);
    expect(body.pagination.total).toBe(5);
    expect(body.data).toHaveLength(2);
  });

  // ---- GET /students/:id ----

  it('GET /api/v1/students/:id returns student by id', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nis: 'STD001' } });
    const studentId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/students/${studentId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).nis).toBe('STD001');
  });

  it('GET /api/v1/students/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/students/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /students ----

  it('POST /api/v1/students creates a new student', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nis: 'STD002', gender: 'male', date_of_birth: '2008-05-12' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.nis).toBe('STD002');
    expect(body.gender).toBe('male');
    expect(body.date_of_birth).toBe('2008-05-12');
  });

  it('POST /api/v1/students validates required nis', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/students returns 409 for duplicate NIS', async () => {
    const [u1, u2] = await Promise.all([
      ensureStudentUser(app, getAuthHeaders(), 100),
      ensureStudentUser(app, getAuthHeaders(), 101),
    ]);
    const nis = 'DUP00001';
    await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: u1, school_id: schoolId, nis } });
    const res = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: u2, school_id: schoolId, nis } });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/v1/students returns 404 for invalid school_id', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: 99999, nis: 'NOSCH' } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/students returns 404 for invalid user_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: 99999, school_id: schoolId, nis: 'NOUSR' } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/students validates date_of_birth format', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nis: 'BADDT', date_of_birth: '12-05-2008' } });
    expect(res.statusCode).toBe(400);
  });

  // ---- PATCH /students/:id ----

  it('PATCH /api/v1/students/:id updates a student', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nis: 'UPD0001' } });
    const studentId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/students/${studentId}`, headers: getAuthHeaders(), payload: { address: 'Jl. Baru', gender: 'female' } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.address).toBe('Jl. Baru');
    expect(body.gender).toBe('female');
  });

  it('PATCH /api/v1/students/:id returns 404 for non-existent student', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/students/99999', headers: getAuthHeaders(), payload: { nis: 'NEW' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /students/:id ----

  it('DELETE /api/v1/students/:id deletes a student without dependents', async () => {
    const userId = await getStudentUserId(app, getAuthHeaders());
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/students', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nis: 'DEL0001' } });
    const studentId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/students/${studentId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);
  });

  it('DELETE /api/v1/students/:id returns 404 for non-existent student', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/students/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });
});

async function ensureStudentUser(app: any, headers: Record<string, string>, seed: number) {
  const res = await app.inject({ method: 'POST', url: '/api/v1/users', headers, payload: { email: `student-${Date.now()}-${seed}@s.com`, password: 'Password123', name: `Siswa ${seed}`, phone: `0812345678${String(seed).padStart(2, '0')}` } });
  return (JSON.parse(res.payload) as { id: number }).id;
}

async function getStudentUserId(app: any, headers: Record<string, string>) {
  // Find existing student user via DB; if none, create one
  const knexModule = await import('../src/config/database');
  const knex = knexModule.getKnex();
  const users = await knex('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('roles.name', 'student')
    .where('user_roles.is_active', true)
    .distinct('user_roles.user_id as id')
    .select('user_roles.user_id as id');
  if (users.length > 0) return users[0].id;
  return ensureStudentUser(app, headers, 1);
}

