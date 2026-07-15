import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('School API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;

  const SCHOOL_NAME = 'Universitas Test';
  const SCHOOL_CODE = 'UTEST';

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  beforeEach(async () => {
    app = await createTestApp();

    // Register admin user dan login untuk dapatkan token
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'admin@example.com',
        password: 'Password123',
        name: 'Admin User',
        role: 'admin',
      },
    });
    const regBody = JSON.parse(regRes.payload) as { token: string };
    token = regBody.token;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // ---- GET /schools ----

  it('GET /api/v1/schools returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schools',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/schools returns empty array initially', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(0);
  });

  it('GET /api/v1/schools filters by search term', async () => {
    // Create 2 schools
    const [s1, s2] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/schools',
        headers: getAuthHeaders(),
        payload: { name: 'SMA Test 1', code: 'SMT1' },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/schools',
        headers: getAuthHeaders(),
        payload: { name: 'SD Test 2', code: 'STD2' },
      }),
    ]);
    const s1Body = JSON.parse(s1.payload);
    const s2Body = JSON.parse(s2.payload);

    // Search by "SMA"
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schools?search=SMA',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.length).toBe(1);
    expect(body.data[0].name).toBe(s1Body.name);
  });

  it('GET /api/v1/schools respects pagination', async () => {
    // Create 5 schools
    for (let i = 1; i <= 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/schools',
        headers: getAuthHeaders(),
        payload: { name: `School ${i}`, code: `SCH${i}` },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schools?page=1&limit=2',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.data.length).toBe(2);
  });

  // ---- GET /schools/:id ----

  it('GET /api/v1/schools/:id returns school by id', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: SCHOOL_NAME, code: SCHOOL_CODE },
    });
    const createBody = JSON.parse(createRes.payload);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${createBody.id}`,
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe(SCHOOL_NAME);
    expect(body.code).toBe(SCHOOL_CODE);
  });

  it('GET /api/v1/schools/:id returns 404 when not found', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/schools/99999',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(404);
  });

  // ---- POST /schools ----

  it('POST /api/v1/schools creates a new school', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: SCHOOL_NAME, code: SCHOOL_CODE },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe(SCHOOL_NAME);
    expect(body.code).toBe(SCHOOL_CODE);
    expect(body.status).toBe('active');
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  it('POST /api/v1/schools validates required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Only Name' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/schools returns 409 for duplicate code', async () => {
    // Create first
    await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: SCHOOL_NAME, code: SCHOOL_CODE },
    });

    // Try duplicate code
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Different School', code: SCHOOL_CODE },
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/v1/schools accepts optional fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: {
        name: SCHOOL_NAME,
        code: SCHOOL_CODE,
        email: 'info@test.school',
        phone: '08123456789',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        address: 'Jl. Contoh No. 1',
        logo_url: 'https://example.com/logo.png',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.email).toBe('info@test.school');
    expect(body.city).toBe('Jakarta');
    expect(body.province).toBe('DKI Jakarta');
  });

  // ---- PATCH /schools/:id ----

  it('PATCH /api/v1/schools/:id updates a school', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'Original Name', code: SCHOOL_CODE },
    });
    const schoolId = JSON.parse(createRes.payload).id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/schools/${schoolId}`,
      headers: getAuthHeaders(),
      payload: { name: 'Updated Name', city: 'Bandung' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe('Updated Name');
    expect(body.city).toBe('Bandung');
    // Old fields preserved
    expect(body.code).toBe(SCHOOL_CODE);
  });

  it('PATCH /api/v1/schools/:id returns 404 for non-existent school', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/schools/99999',
      headers: getAuthHeaders(),
      payload: { name: 'Ghost' },
    });
    expect(res.statusCode).toBe(404);
  });

  // ---- DELETE /schools/:id ----

  it('DELETE /api/v1/schools/:id deletes a school', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/schools',
      headers: getAuthHeaders(),
      payload: { name: 'To Delete', code: 'TODEL' },
    });
    const schoolId = JSON.parse(createRes.payload).id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/schools/${schoolId}`,
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(204);

    // Verify deleted
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/schools/${schoolId}`,
      headers: getAuthHeaders(),
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('DELETE /api/v1/schools/:id returns 404 for non-existent school', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/schools/99999',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(404);
  });
});
