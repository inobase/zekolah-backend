import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('AcademicYear API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let schoolId: number;

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'ayadmin@example.com', password: 'Password123', name: 'AY Admin' },
    });
    token = (JSON.parse(regRes.payload) as { token: string }).token;

    const schoolRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'AY Test School', code: 'AYTEST' },
    });
    schoolId = (JSON.parse(schoolRes.payload) as { id: number }).id;
  });

  afterEach(async () => { await app.close(); });
  afterAll(async () => { await closeAllApps(); });

  // ---- GET /academic-years ----

  it('GET /api/v1/academic-years returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/academic-years' });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/academic-years returns empty array initially', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/academic-years', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toHaveLength(0);
    expect(body.pagination).toBeDefined();
  });

  it('GET /api/v1/academic-years filters by school_id', async () => {
    // Create second school
    const s2Res = await app.inject({ method: 'POST', url: '/api/v1/schools', headers: getAuthHeaders(), payload: { name: 'Other School', code: 'OTH01' } });
    const s2Id = (JSON.parse(s2Res.payload) as { id: number }).id;

    await Promise.all([
      app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } }),
      app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: s2Id, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } }),
    ]);

    const res = await app.inject({ method: 'GET', url: `/api/v1/academic-years?school_id=${schoolId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data).toHaveLength(1);
  });

  // ---- GET /academic-years/:id ----

  it('GET /api/v1/academic-years/:id returns ay by id', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } });
    const ayId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'GET', url: `/api/v1/academic-years/${ayId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).year).toBe('2025/2026');
  });

  it('GET /api/v1/academic-years/:id returns 404 when not found', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/academic-years/99999', headers: getAuthHeaders() });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /academic-years ----

  it('POST /api/v1/academic-years creates a new academic year', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.year).toBe('2025/2026');
    expect(body.semester).toBe('ganjil');
    expect(body.status).toBe('upcoming'); // default
  });

  it('POST /api/v1/academic-years validates required fields', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/academic-years returns 404 for invalid school_id', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: 99999, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } });
    expect(res.statusCode).toBe(404);
  });

  it('POST /api/v1/academic-years returns 400 for invalid date format', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '01-07-2025', end_date: '2026-06-30', semester: 'ganjil' } });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/academic-years returns 400 when start_date >= end_date', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '2026-06-30', end_date: '2026-06-30', semester: 'ganjil' } });
    expect(res.statusCode).toBe(400);
  });

  // ---- PATCH /academic-years/:id ----

  it('PATCH /api/v1/academic-years/:id updates an academic year', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } });
    const ayId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'PATCH', url: `/api/v1/academic-years/${ayId}`, headers: getAuthHeaders(), payload: { status: 'current' } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).status).toBe('current');
  });

  it('PATCH /api/v1/academic-years/:id returns 404 for non-existent ay', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/academic-years/99999', headers: getAuthHeaders(), payload: { status: 'current' } });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /academic-years/:id ----

  it('DELETE /api/v1/academic-years/:id deletes an ay', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/v1/academic-years', headers: getAuthHeaders(), payload: { school_id: schoolId, year: '2025/2026', start_date: '2025-07-01', end_date: '2026-06-30', semester: 'ganjil' } });
    const ayId = (JSON.parse(createRes.payload) as { id: number }).id;

    const res = await app.inject({ method: 'DELETE', url: `/api/v1/academic-years/${ayId}`, headers: getAuthHeaders() });
    expect(res.statusCode).toBe(204);

    const getRes = await app.inject({ method: 'GET', url: `/api/v1/academic-years/${ayId}`, headers: getAuthHeaders() });
    expect(getRes.statusCode).toBe(404);
  });
});

