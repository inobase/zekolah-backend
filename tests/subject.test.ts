import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Subject API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;
  let schoolCode = 'SUBTEST';

  const SUBJECT_NAME = 'Matematika';
  const SUBJECT_CODE = 'MAT001';

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'subadmin@example.com',
        password: 'Password123',
        name: 'Subject Admin',
      },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    // Create a school first for FK
    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Subject Test School', code: schoolCode },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /subjects ----

  it('GET /api/v1/subjects returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/subjects' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/subjects returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/subjects', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toHaveLength(0);
    expect(body.pagination).toBeDefined();
  });

  it('GET /api/v1/subjects filters by search term', async () => {
    await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Fisika Dasar', code: 'FIS01', school_id: schoolId } }),
      app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Kimia Organik', code: 'KIM01', school_id: schoolId } }),
    ]);

    const res = await app.inject({ method: 'GET', url: '/api/v1/subjects?search=Fisika', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(1);
  });

  it('GET /api/v1/subjects respects pagination', async () => {
    for (let i = 1; i <= 5; i++) {
      await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: `Subject ${i}`, code: `SUB${String(i).padStart(3,'0')}`, school_id: schoolId } });
    }
    const res = await app.inject({ method: 'GET', url: '/api/v1/subjects?page=1&limit=2', headers: getAuthHeaders() });
    const body = JSON.parse(res.payload);
    expect(body.pagination.total).toBe(5);
    expect(body.data).toHaveLength(2);
  });

  // ---- GET /subjects/:id ----

  it('GET /api/v1/subjects/:id returns subject by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: SUBJECT_NAME, code: SUBJECT_CODE, school_id: schoolId } });
    const subjId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/subjects/${subjId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).name).toBe(SUBJECT_NAME);
  });

  it('GET /api/v1/subjects/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/subjects/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /subjects ----

  it('POST /api/v1/subjects creates a new subject', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: SUBJECT_NAME, code: SUBJECT_CODE, school_id: schoolId } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe(SUBJECT_NAME);
    expect(body.code).toBe(SUBJECT_CODE);
    expect(body.id).toBeDefined();
  });

  it('POST /api/v1/subjects validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: SUBJECT_NAME } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/subjects returns 409 for duplicate code', async () => {
    await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Subject 1', code: SUBJECT_CODE, school_id: schoolId } });
    const res = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Subject 2', code: SUBJECT_CODE, school_id: schoolId } });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/v1/subjects returns 404 for invalid school_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'No School', code: 'NS001', school_id: 99999 } });
    expect(res.statusCode).toBe(404);
  });

  // ---- PATCH /subjects/:id ----

  it('PATCH /api/v1/subjects/:id updates a subject', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Old Name', code: 'OLD01', school_id: schoolId } });
    const subjId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/subjects/${subjId}`, headers: getAuthHeaders(), payload: { name: 'New Name' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).name).toBe('New Name');
  });

  it('PATCH /api/v1/subjects/:id returns 404 for non-existent subject', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/subjects/99999', headers: getAuthHeaders(), payload: { name: 'Ghost' } });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /api/v1/subjects/:id returns 409 for duplicate code on update', async () => {
    // Create two subjects
    const r1 = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Subject A', code: 'SA01', school_id: schoolId } });
    const r2 = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'Subject B', code: 'SB01', school_id: schoolId } });
    const subj2Id = (JSON.parse(r2.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/subjects/${subj2Id}`, headers: getAuthHeaders(), payload: { code: 'SA01' } });
    expect(res.statusCode).toBe(409);
  });

  // ---- DELETE /subjects/:id ----

  it('DELETE /api/v1/subjects/:id deletes a subject', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/subjects', headers: getAuthHeaders(), payload: { name: 'To Delete', code: 'DEL01', school_id: schoolId } });
    const subjId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/subjects/${subjId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/subjects/${subjId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });

  it('DELETE /api/v1/subjects/:id returns 404 for non-existent subject', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/v1/subjects/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });
});

