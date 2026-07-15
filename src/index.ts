// =====================================================
// Zekolah Backend - Main Entry Point
// Educational Management System API
// =====================================================

import 'dotenv/config';
import { config } from './config';
import { initDatabase, closeDatabase } from './config/database';
import { buildApp } from './app';

const start = async (): Promise<void> => {
  try {
    // Initialize database connection
    await initDatabase();

    const app = await buildApp({ logger: true });
    await app.listen({ port: config.port, host: config.host });

    // Pretty banner with host/port info
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║         🎓 ZEKOLAH BACKEND            ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log(`║  Host:    ${config.host.padEnd(29)}║`);
    console.log(`║  Port:    ${config.port.toString().padEnd(28)}║`);
    console.log(`║  URL:     http://${(config.host + ':' + config.port).padEnd(16)}║`);
    console.log(`║  Env:     ${config.nodeEnv.padEnd(26)}║`);
    console.log(`║  Version: ${'1.0.0'.padEnd(28)}║`);
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    console.log(`  API Base:  http://localhost:${config.port}/api/v1`);
    console.log(`  Health:    http://localhost:${config.port}/health`);
    console.log('');
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  await closeDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
