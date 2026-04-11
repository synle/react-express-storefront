const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// =============================================
// STRIPE PAYMENTS
// =============================================

/**
 * POST /api/payments/stripe/create-payment-intent
 * Creates a Stripe PaymentIntent for the given cart items.
 * Body: { items: [{ productId, quantity }] }
 *
 * The PaymentIntent supports Card, Google Pay, and Apple Pay automatically
 * through Stripe's Payment Element.
 */
router.post('/stripe/create-payment-intent', optionalAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Calculate total from database prices (never trust client-side prices)
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await db('products').where({ id: item.productId }).first();
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      if (item.quantity > product.stock) {
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }
      total += product.price * item.quantity;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Stripe expects amount in cents
    const amountInCents = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      // Enable automatic payment methods — this enables Card, Google Pay, Apple Pay, etc.
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: req.user?.id || 'guest',
        items_json: JSON.stringify(orderItems.map(i => ({
          id: i.product_id,
          qty: i.quantity
        })))
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
 * After frontend confirms payment, this creates the order in our database.
 * Body: { paymentIntentId, items: [{ productId, quantity }], shippingAddress }
 */
router.post('/stripe/confirm-order', optionalAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { paymentIntentId, items, shippingAddress } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Calculate total from database
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await db('products').where({ id: item.productId }).first();
      if (!product) continue;
      total += product.price * item.quantity;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create order
    const orderId = uuidv4();
    await db('orders').insert({
      id: orderId,
      user_id: req.user?.id || null,
      status: 'paid',
      total,
      payment_method: 'stripe',
      payment_id: paymentIntentId,
      shipping_address: JSON.stringify(shippingAddress || {}),
      email: req.user?.email || paymentIntent.receipt_email
    });

    // Create order items
    for (const item of orderItems) {
      await db('order_items').insert({
        order_id: orderId,
        ...item
      });
    }

    // Reduce stock
    for (const item of items) {
      await db('products').where({ id: item.productId }).decrement('stock', item.quantity);
    }

    // Clear user's server-side cart
    if (req.user) {
      await db('cart_items').where({ user_id: req.user.id }).del();
    }

    res.json({
      orderId,
      status: 'paid',
      total
    });
  } catch (err) {
    console.error('Stripe confirm-order error:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// =============================================
// PAYPAL PAYMENTS
// =============================================

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Get PayPal access token using client credentials.
 */
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
 * Creates a PayPal order.
 * Body: { items: [{ productId, quantity }] }
 */
router.post('/paypal/create-order', optionalAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Calculate total from database prices
    let total = 0;
    const paypalItems = [];
    for (const item of items) {
      const product = await db('products').where({ id: item.productId }).first();
      if (!product) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }
      if (item.quantity > product.stock) {
        return res.status(400).json({ error: `Not enough stock for ${product.name}` });
      }
      total += product.price * item.quantity;
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
 * Captures (finalizes) a PayPal payment after user approves.
 * Body: { orderID, items: [{ productId, quantity }], shippingAddress }
 */
router.post('/paypal/capture-order', optionalAuth, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { orderID, items, shippingAddress } = req.body;

    const accessToken = await getPayPalAccessToken();

    // Capture the payment
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

    // Calculate total and create order
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await db('products').where({ id: item.productId }).first();
      if (!product) continue;
      total += product.price * item.quantity;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        price: product.price
      });
    }

    const orderId = uuidv4();
    await db('orders').insert({
      id: orderId,
      user_id: req.user?.id || null,
      status: 'paid',
      total,
      payment_method: 'paypal',
      payment_id: orderID,
      shipping_address: JSON.stringify(shippingAddress || {}),
      email: req.user?.email || captureData.payer?.email_address
    });

    for (const item of orderItems) {
      await db('order_items').insert({ order_id: orderId, ...item });
    }

    // Reduce stock
    for (const item of items) {
      await db('products').where({ id: item.productId }).decrement('stock', item.quantity);
    }

    // Clear user's server-side cart
    if (req.user) {
      await db('cart_items').where({ user_id: req.user.id }).del();
    }

    res.json({
      orderId,
      status: 'paid',
      total
    });
  } catch (err) {
    console.error('PayPal capture-order error:', err.message);
    res.status(500).json({ error: 'Failed to capture PayPal payment' });
  }
});

/**
 * GET /api/payments/config
 * Returns public payment config (publishable keys, client IDs) to the frontend.
 */
router.get('/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    paypalMode: process.env.PAYPAL_MODE || 'sandbox',
    googleClientId: process.env.GOOGLE_CLIENT_ID
  });
});

/**
 * GET /api/payments/orders/:id
 * Get order details.
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
