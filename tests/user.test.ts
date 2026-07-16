import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('User API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let token: string;
  let adminId: number;

  const TEST_EMAIL = 'admin@example.com';
  const TEST_PASSWORD = 'Password123';

  const getAuthHeaders = () => ({ authorization: `Bearer ${token}` });

  const registerUser = async (payload: {
    email: string;
    name: string;
    password?: string;
  }) => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: payload.email,
        password: payload.password ?? 'Password123',
        name: payload.name,
      },
    });
    return JSON.parse(res.payload) as { user: { id: number; email: string } };
  };

  beforeEach(async () => {
    app = await createTestApp();

    // Register admin
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: 'Admin User',
      },
    });
    const regBody = JSON.parse(regRes.payload) as { token: string; user: { id: number } };
    token = regBody.token;
    adminId = regBody.user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // ---- GET /users ----

  it('GET /api/v1/users returns 401 without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
    });
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/v1/users returns user list with pagination', async () => {
    // Create additional users
    await registerUser({ email: 'teacher1@test.com', name: 'Teacher 1' });
    await registerUser({ email: 'teacher2@test.com', name: 'Teacher 2' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBe(3); // admin + 2 teachers
    expect(body.data[0].password).toBeUndefined(); // password harus di-strip
  });

  // Phase 5: GET /api/v1/users?role=xxx filter removed (users.role column dropped).
  // Role-based filtering now goes via /user_roles join or RBAC layer.

  it('GET /api/v1/users searches by name and email', async () => {
    await registerUser({ email: 'john.doe@test.com', name: 'John Doe' });
    await registerUser({ email: 'jane.smith@test.com', name: 'Jane Smith' });

    // Search by name
    const nameRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users?search=John',
      headers: getAuthHeaders(),
    });
    expect(nameRes.statusCode).toBe(200);
    const nameBody = JSON.parse(nameRes.payload);
    expect(nameBody.data.length).toBe(1);
    expect(nameBody.data[0].name).toBe('John Doe');

    // Search by email
    const emailRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users?search=jane.smith',
      headers: getAuthHeaders(),
    });
    expect(emailRes.statusCode).toBe(200);
    const emailBody = JSON.parse(emailRes.payload);
    expect(emailBody.data.length).toBe(1);
    expect(emailBody.data[0].email).toBe('jane.smith@test.com');
  });

  it('GET /api/v1/users respects pagination', async () => {
    // Create 4 additional users (total 5 with admin)
    for (let i = 1; i <= 4; i++) {
      await registerUser({ email: `user${i}@test.com`, name: `User ${i}` });
    }

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?page=2&limit=2',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBe(5);
    expect(body.data.length).toBe(2);
  });

  it('GET /api/v1/users filters by status', async () => {
    const { user } = await registerUser({ email: 'to-deactivate@test.com', name: 'To Deactivate' });

    // Deactivate
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${user.id}`,
      headers: getAuthHeaders(),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?status=inactive',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pagination.total).toBe(1);
    expect(body.data[0].status).toBe('inactive');
  });

  // ---- GET /users/:id ----

  it('GET /api/v1/users/:id returns user by id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${adminId}`,
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.id).toBe(adminId);
    expect(body.email).toBe(TEST_EMAIL);
    expect(body.password).toBeUndefined();
  });

  it('GET /api/v1/users/:id returns 404 when not found', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/99999',
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(404);
  });

  // ---- PATCH /users/:id ----

  it('PATCH /api/v1/users/:id updates allowed fields', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${adminId}`,
      headers: getAuthHeaders(),
      payload: {
        name: 'Updated Admin',
        phone: '08123456789',
        address: 'Jl. Updated',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.name).toBe('Updated Admin');
    expect(body.phone).toBe('08123456789');
    expect(body.address).toBe('Jl. Updated');
    expect(body.password).toBeUndefined();
  });

  it('PATCH /api/v1/users/:id rejects unrecognized fields', async () => {
    // UpdateUserSchema uses .strict(), so unknown fields rejected with 400
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${adminId}`,
      headers: getAuthHeaders(),
      payload: {
        password: 'NewPassword123',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /api/v1/users/:id returns 400 when no valid fields', async () => {
    // Empty body — Zod won't reject it since all fields are optional,
    // but service should reject because no allowed fields supplied
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${adminId}`,
      headers: getAuthHeaders(),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  // ---- DELETE /users/:id (deactivate) ----

  it('DELETE /api/v1/users/:id deactivates user', async () => {
    const { user } = await registerUser({ email: 'todelete@test.com', name: 'To Delete' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${user.id}`,
      headers: getAuthHeaders(),
    });
    expect(res.statusCode).toBe(200);

    // Verify status is inactive
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${user.id}`,
      headers: getAuthHeaders(),
    });
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.payload);
    expect(body.status).toBe('inactive');
  });
});

