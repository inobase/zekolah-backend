// =====================================================
// Database Initialization (Knex)
// MySQL only — development, testing, and production.
// =====================================================

import Knex, { Knex as KnexType } from 'knex';
import { config } from '.';
import { logger } from '../utils/logger';

let knexInstance: KnexType | null = null;

export const getKnex = (): KnexType => {
  if (!knexInstance) {
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
        dateStrings: true,
      },
      pool: { min: 2, max: 10 },
    });
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
