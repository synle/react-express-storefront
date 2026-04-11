const request = require('supertest');
const { setup, teardown } = require('../helpers');

let app, db, ctx;

beforeAll(async () => {
  ctx = await setup('products');
  app = ctx.app;
  db = ctx.db;
});

afterAll(async () => {
  await teardown(ctx);
});

// ================================================
// GET /api/products
// ================================================
describe('GET /api/products', () => {
  test('returns paginated product list', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.products).toBeInstanceOf(Array);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('pages');
  });

  test('respects limit parameter', async () => {
    const res = await request(app).get('/api/products?limit=3');

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(3);
    expect(res.body.pagination.limit).toBe(3);
  });

  test('returns correct page', async () => {
    const res = await request(app).get('/api/products?limit=5&page=2');

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(2);
    // Page 2 with limit 5 on 12 products = 5 items
    expect(res.body.products.length).toBe(5);
  });

  test('filters by search term', async () => {
    const res = await request(app).get('/api/products?search=headphones');

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].name).toMatch(/headphones/i);
  });

  test('filters by category', async () => {
    const res = await request(app).get('/api/products?category=Electronics');

    expect(res.status).toBe(200);
    res.body.products.forEach(p => {
      expect(p.category).toBe('Electronics');
    });
  });

  test('returns empty array for no-match search', async () => {
    const res = await request(app).get('/api/products?search=xyznomatch');

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(0);
    expect(res.body.pagination.total).toBe(0);
  });
});

// ================================================
// GET /api/products/categories
// ================================================
describe('GET /api/products/categories', () => {
  test('returns array of category strings', async () => {
    const res = await request(app).get('/api/products/categories');

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toContain('Electronics');
    expect(res.body).toContain('Clothing');
    expect(res.body).toContain('Home');
  });
});

// ================================================
// GET /api/products/:id
// ================================================
describe('GET /api/products/:id', () => {
  test('returns a single product by ID', async () => {
    const res = await request(app).get('/api/products/1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('price');
    expect(res.body).toHaveProperty('description');
    expect(res.body).toHaveProperty('stock');
  });

  test('returns 404 for non-existent product', async () => {
    const res = await request(app).get('/api/products/99999');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ================================================
// GET /api/health
// ================================================
describe('GET /api/health', () => {
  test('returns ok status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
