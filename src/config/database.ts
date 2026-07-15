// =====================================================
// Database Initialization (Knex)
// Supports MySQL (production) and SQLite (testing).
// =====================================================

import Knex, { Knex as KnexType } from 'knex';
import { config } from '.';
import { logger } from '../utils/logger';

let knexInstance: KnexType | null = null;

const isTest = process.env.NODE_ENV === 'test';

export const getKnex = (): KnexType => {
  if (!knexInstance) {
    if (isTest) {
      // In-memory SQLite for tests. The instance lives only as long as
      // this process, so each vitest run starts with a fresh schema.
      knexInstance = Knex({
        client: 'better-sqlite3',
        connection: {
          filename: ':memory:',
        },
        useNullAsDefault: true,
        pool: {
          afterCreate: (conn: unknown, cb: (err: Error | null, conn: unknown) => void) => {
            // Enable foreign key enforcement for SQLite (off by default).
            const c = conn as { pragma: (sql: string) => unknown };
            try {
              c.pragma('foreign_keys = ON');
            } catch {
              // ignore if pragma unsupported
            }
            cb(null, conn);
          },
        },
      });
    } else {
      knexInstance = Knex({
        client: 'mysql2',
        connection: {
          host: config.dbHost,
          port: config.dbPort,
          database: config.dbName,
          user: config.dbUser,
          password: config.dbPass,
          charset: 'utf8mb4',
          timezone: '+07:00',
        },
        pool: { min: 2, max: 10 },
      });
    }
  }
  return knexInstance;
};

export const initDatabase = async (): Promise<void> => {
  try {
    const knex = getKnex();
    await knex.raw('SELECT 1');
    logger.info('✅ Database connected successfully');
  } catch (err) {
    logger.error('❌ Database connection failed:', err as Error);
    throw err;
  }
};

export const closeDatabase = async (): Promise<void> => {
  if (knexInstance) {
    await knexInstance.destroy();
    if (!isTest) {
      logger.info('Database connection closed');
    }
    knexInstance = null;
  }
};
