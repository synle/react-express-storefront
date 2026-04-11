const knex = require('knex');
const path = require('path');
const fs = require('fs');
const createApp = require('../app');

/**
 * Creates an isolated test environment with its own SQLite database.
 * Each test suite gets a fresh DB so tests don't interfere with each other.
 *
 * Usage:
 *   const { setup, teardown } = require('../helpers');
 *   let app, db;
 *   beforeAll(async () => { ({ app, db } = await setup('my-suite')) });
 *   afterAll(async () => { await teardown(ctx) });
 */
async function setup(suiteName) {
  const dbPath = path.join(__dirname, '..', 'db', `test_${suiteName}_${Date.now()}.sqlite3`);
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, '..', 'db', 'migrations') },
    seeds: { directory: path.join(__dirname, '..', 'db', 'seeds') }
  });

  await db.migrate.latest();
  await db.seed.run();

  const app = createApp(db);
  return { app, db, dbPath };
}

async function teardown(ctx) {
  if (ctx.db) {
    await ctx.db.destroy();
  }
  if (ctx.dbPath) {
    try { fs.unlinkSync(ctx.dbPath); } catch { /* already cleaned up */ }
  }
}

module.exports = { setup, teardown };
