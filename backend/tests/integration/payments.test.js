const request = require('supertest');
const { setup, teardown } = require('../helpers');

let app, db, ctx;

beforeAll(async () => {
  ctx = await setup('payments');
  app = ctx.app;
  db = ctx.db;
});

afterAll(async () => {
  await teardown(ctx);
});

// ================================================
// GET /api/payments/config
// ================================================
describe('GET /api/payments/config', () => {
  test('returns demo mode when no keys configured', async () => {
    const res = await request(app).get('/api/payments/config');

    expect(res.status).toBe(200);
    expect(res.body.demoMode).toBe(true);
    expect(res.body.stripeEnabled).toBe(false);
    expect(res.body.paypalEnabled).toBe(false);
    expect(res.body.stripePublishableKey).toBeNull();
    expect(res.body.paypalClientId).toBeNull();
  });
});

// ================================================
// POST /api/payments/demo/pay — success flow
// ================================================
describe('POST /api/payments/demo/pay', () => {
  test('processes a successful demo payment', async () => {
    const res = await request(app)
      .post('/api/payments/demo/pay')
      .send({
        items: [{ productId: 1, quantity: 2 }],
        card: { number: '4242 4242 4242 4242', exp: '12/29', cvc: '123' }
      });

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBeDefined();
    expect(res.body.status).toBe('paid');
    expect(res.body.demo).toBe(true);
    expect(res.body.total).toBe(159.98); // 79.99 * 2
  });

  test('creates order with correct items in database', async () => {
    const payRes = await request(app)
      .post('/api/payments/demo/pay')
      .send({
        items: [
          { productId: 3, quantity: 1 },
          { productId: 5, quantity: 2 }
        ],
        card: { number: '4242 4242 4242 4242' }
      });

    expect(payRes.status).toBe(200);

    // Verify order exists in DB
    const order = await db('orders').where({ id: payRes.body.orderId }).first();
    expect(order).toBeDefined();
    expect(order.status).toBe('paid');
    expect(order.payment_method).toBe('demo');

    // Verify order items
    const items = await db('order_items').where({ order_id: order.id });
    expect(items.length).toBe(2);
    expect(items.find(i => i.product_id === 3).quantity).toBe(1);
    expect(items.find(i => i.product_id === 5).quantity).toBe(2);
  });

  test('reduces product stock after payment', async () => {
    const before = await db('products').where({ id: 10 }).first();
    const qty = 3;

    await request(app)
      .post('/api/payments/demo/pay')
      .send({
        items: [{ productId: 10, quantity: qty }],
        card: { number: '4242 4242 4242 4242' }
      });

    const after = await db('products').where({ id: 10 }).first();
    expect(after.stock).toBe(before.stock - qty);
  });
});

// ================================================
// POST /api/payments/demo/pay — error cases
// ================================================
describe('POST /api/payments/demo/pay — errors', () => {
  test('rejects empty items', async () => {
    const res = await request(app)
      .post('/api/payments/demo/pay')
      .send({ items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no items/i);
  });

  test('rejects non-existent product', async () => {
    const res = await request(app)
      .post('/api/payments/demo/pay')
      .send({ items: [{ productId: 99999, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('rejects quantity exceeding stock', async () => {
    const res = await request(app)
      .post('/api/payments/demo/pay')
      .send({ items: [{ productId: 2, quantity: 9999 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not enough stock/i);
  });

  test('declines the test-decline card number', async () => {
    const res = await request(app)
      .post('/api/payments/demo/pay')
      .send({
        items: [{ productId: 1, quantity: 1 }],
        card: { number: '4000000000000002' }
      });

    expect(res.status).toBe(402);
    expect(res.body.error).toMatch(/declined/i);
  });
});

// ================================================
// GET /api/payments/orders/:id
// ================================================
describe('GET /api/payments/orders/:id', () => {
  test('retrieves an order with its items', async () => {
    // Create an order first
    const payRes = await request(app)
      .post('/api/payments/demo/pay')
      .send({
        items: [{ productId: 9, quantity: 1 }],
        card: { number: '4242 4242 4242 4242' }
      });

    const res = await request(app).get(`/api/payments/orders/${payRes.body.orderId}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(payRes.body.orderId);
    expect(res.body.status).toBe('paid');
    expect(res.body.items).toBeInstanceOf(Array);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].product_name).toBe('Ceramic Mug Set');
  });

  test('returns 404 for non-existent order', async () => {
    const res = await request(app).get('/api/payments/orders/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ================================================
// Stripe/PayPal return 501 when not configured
// ================================================
describe('unconfigured payment providers', () => {
  test('Stripe create-intent returns 501', async () => {
    const res = await request(app)
      .post('/api/payments/stripe/create-payment-intent')
      .send({ items: [{ productId: 1, quantity: 1 }] });

    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/not configured/i);
  });

  test('PayPal create-order returns 501', async () => {
    const res = await request(app)
      .post('/api/payments/paypal/create-order')
      .send({ items: [{ productId: 1, quantity: 1 }] });

    expect(res.status).toBe(501);
    expect(res.body.error).toMatch(/not configured/i);
  });
});
