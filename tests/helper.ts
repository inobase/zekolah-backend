// Test helper: build Fastify app, inject requests, cleanup after each test.
import { buildApp } from '../src/app';
import { initDatabase, closeDatabase } from '../src/config/database';

// Track built apps so we can close them.
const openedApps: ReturnType<typeof buildApp>[] = [];

export async function createTestApp() {
  const app = await buildApp({ logger: false });
  openedApps.push(app);
  return app;
}

export async function closeAllApps() {
  for (const app of openedApps) {
    try {
      await app.close();
    } catch {
      // ignore close errors
    }
  }
  openedApps.length = 0;
  await closeDatabase();
}
