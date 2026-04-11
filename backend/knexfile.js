require('dotenv').config();
const path = require('path');

module.exports = {
  // =============================================
  // DEVELOPMENT — SQLite (zero-config, file-based)
  // =============================================
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: path.join(__dirname, 'db', 'shop.sqlite3')
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'db', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds')
    }
  },

  // =============================================
  // TO SWITCH TO POSTGRESQL:
  //   1. npm install pg
  //   2. Set DB_* env vars in .env
  //   3. Change NODE_ENV=postgres (or rename this key to 'development')
  // =============================================
  postgres: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'shop',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'db', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds')
    }
  },

  // =============================================
  // TO SWITCH TO MYSQL:
  //   1. npm install mysql2
  //   2. Set DB_* env vars in .env
  //   3. Change NODE_ENV=mysql (or rename this key to 'development')
  // =============================================
  mysql: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'shop',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(__dirname, 'db', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds')
    }
  },

  // =============================================
  // PRODUCTION — PostgreSQL (recommended)
  // =============================================
  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: { min: 2, max: 20 },
    migrations: {
      directory: path.join(__dirname, 'db', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, 'db', 'seeds')
    }
  }
};
