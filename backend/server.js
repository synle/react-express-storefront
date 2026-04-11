require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('knex');
const knexConfig = require('./knexfile');

const app = express();
const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env] || knexConfig.development);

// Make db available to all routes via req.app.locals.db
app.locals.db = db;

// --- Stripe webhook route MUST come before express.json() ---
// Stripe requires the raw request body to verify webhook signatures
const paymentsWebhook = require('./routes/payments-webhook');
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), paymentsWebhook);

// --- Middleware ---
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// --- API Routes ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/payments', require('./routes/payments'));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env });
});

// --- Start server ---
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Run database migrations
    await db.migrate.latest();
    console.log('Database migrations complete');

    // Seed database if products table is empty
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
