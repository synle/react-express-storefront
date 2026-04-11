const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// =============================================
// DEMO MODE DETECTION
// Stripe/PayPal/demo are auto-detected based on which env vars are set.
// If no payment keys are configured, the app runs in demo mode so the
// full purchase flow still works out of the box.
// =============================================

// Returns true only if the value is a real key, not a placeholder from .env.example
function isRealKey(val) {
  if (!val) return false;
  // Reject placeholder patterns like "your-xxx", "sk_test_xxxx", "pk_test_xxxx" (all x's)
  if (/^(your-|xxxx)/.test(val)) return false;
  if (/x{6,}/.test(val)) return false;
  return true;
}

const HAS_STRIPE = isRealKey(process.env.STRIPE_SECRET_KEY) && isRealKey(process.env.STRIPE_PUBLISHABLE_KEY);
const HAS_PAYPAL = isRealKey(process.env.PAYPAL_CLIENT_ID) && isRealKey(process.env.PAYPAL_CLIENT_SECRET);

let stripe = null;
if (HAS_STRIPE) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

if (!HAS_STRIPE && !HAS_PAYPAL) {
  console.log('----------------------------------------------------------');
  console.log('  DEMO MODE — no Stripe/PayPal keys detected.');
  console.log('  Payments are simulated. Add API keys to .env to go live.');
  console.log('----------------------------------------------------------');
}

// =============================================
// Shared helper: calculate order total from DB
// =============================================
async function calculateOrder(db, items) {
  let total = 0;
  const orderItems = [];
  for (const item of items) {
    const product = await db('products').where({ id: item.productId }).first();
    if (!product) {
      throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });
    }
    if (item.quantity > product.stock) {
      throw Object.assign(new Error(`Not enough stock for ${product.name}`), { status: 400 });
    }
    total += product.price * item.quantity;
    orderItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      price: product.price
    });
  }
  return { total, orderItems };
}

// =============================================
// Shared helper: persist order + reduce stock
// =============================================
async function createOrder(db, { userId, total, paymentMethod, paymentId, email, items, orderItems }) {
  const orderId = uuidv4();
  await db('orders').insert({
    id: orderId,
    user_id: userId || null,
    status: 'paid',
    total,
    payment_method: paymentMethod,
    payment_id: paymentId,
    shipping_address: '{}',
    email: email || null
  });

  for (const oi of orderItems) {
    await db('order_items').insert({ order_id: orderId, ...oi });
  }

  for (const item of items) {
    await db('products').where({ id: item.productId }).decrement('stock', item.quantity);
  }

  if (userId) {
    await db('cart_items').where({ user_id: userId }).del();
  }

  return orderId;
}

// =============================================
// DEMO PAYMENTS  (works with zero config)
// =============================================

/**
 * POST /api/payments/demo/pay
 * Simulates a full payment. Validates items, "charges" the card, creates the order.
 * Body: { items: [{ productId, quantity }], card: { number, exp, cvc } }
 *
 * The card object is cosmetic — any values are accepted. In a real integration
 * the card never touches your server (Stripe Elements handles it client-side).
 */
router.post('/demo/pay', optionalAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { items, card } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const { total, orderItems } = await calculateOrder(db, items);

    // Simulate declined card
    if (card?.number?.replace(/\s/g, '') === '4000000000000002') {
      return res.status(402).json({ error: 'Card declined (test decline card used)' });
    }

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 800));

    const fakePaymentId = `demo_${uuidv4().slice(0, 8)}`;
    const orderId = await createOrder(db, {
      userId: req.user?.id,
      total,
      paymentMethod: 'demo',
      paymentId: fakePaymentId,
      email: req.user?.email,
      items,
      orderItems
    });

    res.json({ orderId, status: 'paid', total, demo: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// =============================================
// STRIPE PAYMENTS
// =============================================

/**
 * POST /api/payments/stripe/create-payment-intent
 */
router.post('/stripe/create-payment-intent', optionalAuth, async (req, res) => {
  if (!HAS_STRIPE) {
    return res.status(501).json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env' });
  }
  try {
    const db = req.app.locals.db;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const { total, orderItems } = await calculateOrder(db, items);
    const amountInCents = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: req.user?.id || 'guest',
        items_json: JSON.stringify(orderItems.map(i => ({ id: i.product_id, qty: i.quantity })))
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: total
    });
  } catch (err) {
    console.error('Stripe create-payment-intent error:', err.message);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * POST /api/payments/stripe/confirm-order
 */
router.post('/stripe/confirm-order', optionalAuth, async (req, res) => {
  if (!HAS_STRIPE) {
    return res.status(501).json({ error: 'Stripe is not configured' });
  }
  try {
    const db = req.app.locals.db;
    const { paymentIntentId, items } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const { total, orderItems } = await calculateOrder(db, items);

    const orderId = await createOrder(db, {
      userId: req.user?.id,
      total,
      paymentMethod: 'stripe',
      paymentId: paymentIntentId,
      email: req.user?.email || paymentIntent.receipt_email,
      items,
      orderItems
    });

    res.json({ orderId, status: 'paid', total });
  } catch (err) {
    console.error('Stripe confirm-order error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Failed to create order' });
  }
});

// =============================================
// PAYPAL PAYMENTS
// =============================================

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

/**
 * POST /api/payments/paypal/create-order
 */
router.post('/paypal/create-order', optionalAuth, async (req, res) => {
  if (!HAS_PAYPAL) {
    return res.status(501).json({ error: 'PayPal is not configured. Add PAYPAL_CLIENT_ID to .env' });
  }
  try {
    const db = req.app.locals.db;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const { total } = await calculateOrder(db, items);

    const paypalItems = [];
    for (const item of items) {
      const product = await db('products').where({ id: item.productId }).first();
      paypalItems.push({
        name: product.name,
        unit_amount: { currency_code: 'USD', value: product.price.toFixed(2) },
        quantity: item.quantity.toString()
      });
    }

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: total.toFixed(2),
            breakdown: {
              item_total: { currency_code: 'USD', value: total.toFixed(2) }
            }
          },
          items: paypalItems
        }]
      })
    });

    const order = await response.json();
    if (order.error) {
      console.error('PayPal create order error:', order);
      return res.status(500).json({ error: 'Failed to create PayPal order' });
    }

    res.json({ orderID: order.id });
  } catch (err) {
    console.error('PayPal create-order error:', err.message);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

/**
 * POST /api/payments/paypal/capture-order
 */
router.post('/paypal/capture-order', optionalAuth, async (req, res) => {
  if (!HAS_PAYPAL) {
    return res.status(501).json({ error: 'PayPal is not configured' });
  }
  try {
    const db = req.app.locals.db;
    const { orderID, items } = req.body;

    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const captureData = await response.json();
    if (captureData.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed', details: captureData });
    }

    const { total, orderItems } = await calculateOrder(db, items);

    const orderId = await createOrder(db, {
      userId: req.user?.id,
      total,
      paymentMethod: 'paypal',
      paymentId: orderID,
      email: req.user?.email || captureData.payer?.email_address,
      items,
      orderItems
    });

    res.json({ orderId, status: 'paid', total });
  } catch (err) {
    console.error('PayPal capture-order error:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Failed to capture PayPal payment' });
  }
});

// =============================================
// CONFIG & ORDERS
// =============================================

/**
 * GET /api/payments/config
 * Returns public payment config to the frontend.
 * The frontend uses these flags to decide which payment UIs to render.
 */
router.get('/config', (req, res) => {
  res.json({
    demoMode: !HAS_STRIPE && !HAS_PAYPAL,
    stripeEnabled: HAS_STRIPE,
    stripePublishableKey: HAS_STRIPE ? process.env.STRIPE_PUBLISHABLE_KEY : null,
    paypalEnabled: HAS_PAYPAL,
    paypalClientId: HAS_PAYPAL ? process.env.PAYPAL_CLIENT_ID : null,
    paypalMode: process.env.PAYPAL_MODE || 'sandbox',
    googleClientId: process.env.GOOGLE_CLIENT_ID || null
  });
});

/**
 * GET /api/payments/orders/:id
 */
router.get('/orders/:id', optionalAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const order = await db('orders').where({ id: req.params.id }).first();
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await db('order_items')
      .where({ order_id: order.id })
      .select('*');

    res.json({ ...order, items });
  } catch (err) {
    console.error('Order detail error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

module.exports = router;
