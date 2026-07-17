// =====================================================
// Role Assignment API Integration Tests
// Tests: POST /users/:id/roles, GET /users/:id/roles,
//        PATCH /user-roles/:roleId, DELETE /user-roles/:roleId,
//        GET /me/roles, GET /me/context
// =====================================================
import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

const TEST_EMAIL = 'role-test@example.com';
const TEST_PASSWORD = 'Password123';
const TEST_NAME = 'Role Test User';

describe('Role Assignment API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;
  let userId: number;
  let adminRoleId: number;
  let superAdminRoleId: number;
  let staffRoleId: number;
  let token: string;
  let roleAssignmentId: number;

  beforeEach(async () => {
    app = await createTestApp();

    // Register a new user
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
    });
    const regBody = JSON.parse(regRes.payload as string);
    token = regBody.token;
    userId = regBody.user.id;

    // Fetch role IDs from DB (only non-reserved roles are assignable via API)
    const knex = (await import('../src/config/database')).getKnex();
    const roleRows = await knex('roles').whereIn('name', ['admin', 'super_admin', 'staff']);
    for (const r of roleRows) {
      switch (r.name) {
        case 'admin': adminRoleId = r.id; break;
        case 'super_admin': superAdminRoleId = r.id; break;
        case 'staff': staffRoleId = r.id; break;
      }
    }
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // Helper: assign a role to the current user, returns the assignment id
  async function assignRole(roleId: number): Promise<number> {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      payload: { role_id: roleId },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload as string);
    return body.data.id;
  }

  // T3.x — Role Management API Tests

  it('POST /users/:id/roles assigns an admin role successfully (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role_id: adminRoleId },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload as string);
    expect(body.message).toBe('Role assigned successfully');
    expect(body.data.role_name).toBe('admin');
    roleAssignmentId = body.data.id;
  });

  it('POST /users/:id/roles assigns a super_admin role successfully (201)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role_id: superAdminRoleId },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload as string);
    expect(body.data.role_name).toBe('super_admin');
    roleAssignmentId = body.data.id;
  });

  it('POST /users/:id/roles rejects student or teacher roles manually (400)', async () => {
    const knex = (await import('../src/config/database')).getKnex();
    const teacherRow = await knex('roles').where({ name: 'teacher' }).first();
    const teacherId = teacherRow?.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role_id: teacherId },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /users/:id/roles rejects duplicate active assignment (409)', async () => {
    await assignRole(adminRoleId);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role_id: adminRoleId },
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /users/:id/roles validates required fields (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role_id: 'invalid-string' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('GET /users/:id/roles lists assigned roles (200)', async () => {
    roleAssignmentId = await assignRole(adminRoleId);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/user-roles/users/${userId}/roles`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload as string);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('PATCH /user-roles/:roleId toggles is_active to false (200)', async () => {
    roleAssignmentId = await assignRole(adminRoleId);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/user-roles/${roleAssignmentId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { is_active: false },
    });
    expect(res.statusCode).toBe(200);
  });

  it('DELETE /user-roles/:roleId removes assignment (204)', async () => {
    roleAssignmentId = await assignRole(superAdminRoleId);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/user-roles/${roleAssignmentId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(204);
  });

  it('GET /me/roles returns empty initially, populated after assignment', async () => {
    // Initially empty
    const resEmpty = await app.inject({
      method: 'GET',
      url: '/api/v1/user-roles/me/roles',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resEmpty.statusCode).toBe(200);
    const emptyBody = JSON.parse(resEmpty.payload as string);
    expect(emptyBody.data.length).toBe(0);

    // After assignment
    roleAssignmentId = await assignRole(adminRoleId);
    const resFull = await app.inject({
      method: 'GET',
      url: '/api/v1/user-roles/me/roles',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(resFull.statusCode).toBe(200);
    const fullBody = JSON.parse(resFull.payload as string);
    expect(fullBody.data.length).toBeGreaterThan(0);
    expect(fullBody.data[0].role_name).toBe('admin');
  });

  it('GET /me/context returns school/year contexts for user', async () => {
    roleAssignmentId = await assignRole(superAdminRoleId);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/user-roles/me/context',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload as string);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('Unauthorized request returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/user-roles/me/roles',
      headers: { authorization: 'Bearer invalid_token_here' },
    });
    expect(res.statusCode).toBe(401);
  });
});