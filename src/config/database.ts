// =====================================================
// Database Initialization (Knex)
// MySQL only — development, testing, and production.
// =====================================================

import Knex, { Knex as KnexType } from 'knex';
import { config } from '.';
import { logger } from '../utils/logger';

// Patch Knex whereLike to use utf8mb4_general_ci instead of utf8_bin.
// Knex 3.x hardcodes 'COLLATE utf8_bin' which is not valid for utf8mb4 charset
// and throws 'COLLATION utf8_bin is not valid for CHARACTER SET utf8mb4'.
const MySQLQueryCompiler = require('knex/lib/dialects/mysql/query/mysql-querycompiler.js');
if (MySQLQueryCompiler && MySQLQueryCompiler.prototype) {
  const originalWhereLike = MySQLQueryCompiler.prototype.whereLike;
  MySQLQueryCompiler.prototype.whereLike = function (statement: any) {
    return originalWhereLike
      .call(this, statement)
      .replace('COLLATE utf8_bin', 'COLLATE utf8mb4_general_ci');
  };
}

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
    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest) {
      logger.info('Database connection closed');
    }
    knexInstance = null;
  }
};
