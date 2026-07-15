// health check tests — public endpoint, no DB dependency
import { describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestApp, closeAllApps } from './helper';

describe('Health & Ping API', () => {
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

  it('GET /health returns 200 with status ok', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('zekolah-backend');
    expect(body.version).toBe('1.0.0');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/v1/ping returns 200 with pong', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/ping',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.pong).toBe(true);
  });
});
