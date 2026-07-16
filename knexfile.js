const path = require('path');

const baseConfig = {
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    reapIntervalMillis: 10000,
  },
  migrations: {
    tableName: 'migrations',
    directory: path.join(__dirname, 'migrations'),
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
  },
};

function knexConfig() {
  return {
    development: {
      ...baseConfig,
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'zekolah',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        charset: 'utf8mb4',
        timezone: '+07:00',
        dateStrings: true,
      },
    },
    test: {
      ...baseConfig,
      client: 'better-sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
    },
    production: {
      ...baseConfig,
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        charset: 'utf8mb4',
        timezone: '+07:00',
        dateStrings: true,
      },
    },
  };
}

module.exports = knexConfig;
