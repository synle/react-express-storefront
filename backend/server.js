require('dotenv').config();
const knex = require('knex');
const knexConfig = require('./knexfile');
const createApp = require('./app');

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env] || knexConfig.development);
const app = createApp(db);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await db.migrate.latest();
    console.log('Database migrations complete');

    const result = await db('products').count('* as count').first();
    if (result.count === 0) {
      await db.seed.run();
      console.log('Database seeded with sample products');
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Environment: ${env}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
