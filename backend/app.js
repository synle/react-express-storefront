const express = require('express');
const cors = require('cors');

/**
 * Creates and configures the Express application.
 * Accepts a Knex database instance so tests can inject their own test DB.
 */
function createApp(db) {
  const app = express();
  app.locals.db = db;

  // Stripe webhook needs raw body — must be mounted before express.json()
  const paymentsWebhook = require('./routes/payments-webhook');
  app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), paymentsWebhook);

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/products', require('./routes/products'));
  app.use('/api/cart', require('./routes/cart'));
  app.use('/api/payments', require('./routes/payments'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
  });

  return app;
}

module.exports = createApp;
