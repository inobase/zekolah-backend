// Auth integration tests: register, login, JWT auth, error cases.
import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { createTestApp, closeAllApps } from './helper';
import { getKnex } from '../src/config/database';
import { config } from '../src/config';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Password123';
const TEST_NAME = 'Test User';

describe('Auth API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await closeAllApps();
  });

  // ---- Registration ----

  it('POST /api/v1/auth/register registers a new user and returns token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user.name).toBe(TEST_NAME);
    expect(body.user.password).toBeUndefined(); // stripped
    expect(body.token).toBeDefined();
  });

  it('POST /api/v1/auth/register returns 409 when email exists', async () => {
    // Register first
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      },
    });

    // Attempt duplicate
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: 'anotherpassword123',
        name: 'Another',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.payload);
    expect(body.message).toBe('Email is already registered');
  });

  it('POST /api/v1/auth/register validates email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'not-an-email',
        password: 'password123',
        name: 'Test',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/v1/auth/register validates password length', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: 'new@example.com',
        password: 'short',
        name: 'Test',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  // ---- Login ----

  it('POST /api/v1/auth/login returns user and token with valid credentials', async () => {
    // Register first
    const hash = await bcrypt.hash(TEST_PASSWORD, config.bcryptRounds);
    const knex = getKnex();
    await knex('users').insert({
      email: TEST_EMAIL,
      password: hash,
      name: TEST_NAME,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.user.password).toBeUndefined();
    expect(body.token).toBeDefined();
  });

  it('POST /api/v1/auth/login returns 401 with invalid password', async () => {
    const hash = await bcrypt.hash(TEST_PASSWORD, config.bcryptRounds);
    const knex = getKnex();
    await knex('users').insert({
      email: TEST_EMAIL,
      password: hash,
      name: TEST_NAME,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: TEST_EMAIL,
        password: 'wrongpassword123',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('POST /api/v1/auth/login returns 401 when user not found', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'nonexistent@example.com',
        password: 'anything',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  // ---- Get Me ----

  it('GET /api/v1/auth/me returns user with valid JWT', async () => {
    // Register to get token
    const regRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: TEST_NAME,
      },
    });
    const regBody = JSON.parse(regRes.payload) as { token: string };

    // Use token
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${regBody.token}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.email).toBe(TEST_EMAIL);
  });

  it('GET /api/v1/auth/me returns 401 with invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer invalid-token',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

