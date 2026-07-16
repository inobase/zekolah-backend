import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Teacher API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'tchadmin@example.com', password: 'Password123', name: 'Teacher Admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Teacher Test School', code: 'TCHTEST' },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;

    // Create a user for teacher FK
    const userRes = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
      payload: { email: 'teacher@test.com', password: 'Password123', name: 'Guru Test', phone: '081234567890' },
    });
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /teachers ----

  it('GET /api/v1/teachers returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/teachers' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/teachers returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/teachers', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(0);
  });

  it('GET /api/v1/teachers filters by search term', async () => {
    // Create a user and teacher first
    const u1 = await createUser(app, getAuthHeaders());
    const u2 = await createUser(app, getAuthHeaders());
    await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: u1, school_id: schoolId, nip: '123456789', specialization: 'Matematika' } });
    await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: u2, school_id: schoolId, nip: '987654321', specialization: 'Bahasa' } });

    const res = await app.inject({ method: 'GET', url: '/api/v1/teachers?search=Bahasa', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    // specialization filter searches across joined columns
    expect(JSON.parse(res.payload).data.length).toBeGreaterThanOrEqual(1);
  });

  // ---- GET /teachers/:id ----

  it('GET /api/v1/teachers/:id returns teacher by id', async () => {
    const userId = await getUserId(app, getAuthHeaders());
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nip: '11223344' } });
    const teacherId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/teachers/${teacherId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
  });

  it('GET /api/v1/teachers/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/teachers/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /teachers ----

  it('POST /api/v1/teachers creates a new teacher', async () => {
    const userId = await getUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nip: '55667788', specialization: 'Fisika' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user_id).toBe(userId);
    expect(body.nip).toBe('55667788');
  });

  it('POST /api/v1/teachers allows teacher without nip', async () => {
    const userId = await getUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.nip).toBeNull();
  });

  it('POST /api/v1/teachers validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: 1 } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/teachers returns 409 for duplicate NIP', async () => {
    const [u1, u2] = await Promise.all([createUser(app, getAuthHeaders()), createUser(app, getAuthHeaders())]);
    const nip = '1122334455';
    await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: u1, school_id: schoolId, nip } });
    const res = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: u2, school_id: schoolId, nip } });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/v1/teachers returns 404 for invalid school_id', async () => {
    const userId = await getUserId(app, getAuthHeaders());
    const res = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: 99999, nip: '112233' } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/teachers returns 404 for invalid user_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: 99999, school_id: schoolId, nip: '112233' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- PATCH /teachers/:id ----

  it('PATCH /api/v1/teachers/:id updates a teacher', async () => {
    const userId = await getUserId(app, getAuthHeaders());
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nip: 'OLDNIP' } });
    const teacherId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/teachers/${teacherId}`, headers: getAuthHeaders(), payload: { specialization: 'Kimia' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).specialization).toBe('Kimia');
  });

  it('PATCH /api/v1/teachers/:id returns 404 for non-existent teacher', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/teachers/99999', headers: getAuthHeaders(), payload: { nip: 'NEW' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /teachers/:id ----

  it('DELETE /api/v1/teachers/:id deletes a teacher', async () => {
    const userId = await getUserId(app, getAuthHeaders());
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/teachers', headers: getAuthHeaders(), payload: { user_id: userId, school_id: schoolId, nip: 'DELETETEST' } });
    const teacherId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/teachers/${teacherId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/teachers/${teacherId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });
});

let _uid = 0;
async function createUser(app: any, headers: Record<string, string>) {
  _uid++;
  const res = await app.inject({ method: 'POST', url: '/api/v1/users', headers, payload: { email: `teacher-${_uid}@t.com`, password: 'Password123', name: `Teacher ${_uid}`, phone: '081234567890' } });
  return (JSON.parse(res.payload) as { id: number }).id;
}

async function getUserId(app: any, headers: Record<string, string>) {
  // Find the first teacher user from user_roles table (Phase 5: users.role dropped)
  const knexModule = await import('../src/config/database');
  const knex = knexModule.getKnex();
  const users = await knex('user_roles')
    .join('roles', 'user_roles.role_id', 'roles.id')
    .where('roles.name', 'teacher')
    .where('user_roles.is_active', true)
    .distinct('user_roles.user_id as id')
    .select('user_roles.user_id as id');
  if (users.length > 0) return users[0].id;
  // Fallback: create one
  _uid += 1000;
  const res = await app.inject({ method: 'POST', url: '/api/v1/users', headers, payload: { email: `temp-${_uid}@t.com`, password: 'Password123', name: `Temp ${_uid}`, phone: '081234567890' } });
  return (JSON.parse(res.payload) as { id: number }).id;
}

