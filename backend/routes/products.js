const express = require('express');
const router = express.Router();

/**
 * GET /api/products
 * List products with optional search and category filter.
 * Query params: ?search=term&category=Electronics&page=1&limit=12
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { search, category, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = db('products');
    let countQuery = db('products').count('* as total');

    // Search by name or description
    if (search) {
      const term = `%${search}%`;
      query = query.where(function () {
        this.where('name', 'like', term).orWhere('description', 'like', term);
      });
      countQuery = countQuery.where(function () {
        this.where('name', 'like', term).orWhere('description', 'like', term);
      });
    }

    // Filter by category
    if (category) {
      query = query.where({ category });
      countQuery = countQuery.where({ category });
    }

    const [{ total }] = await countQuery;
    const products = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/categories
 * Get list of all product categories.
 */
router.get('/categories', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const rows = await db('products').distinct('category').orderBy('category');
    const categories = rows.map(r => r.category).filter(Boolean);
    res.json(categories);
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const product = await db('products').where({ id: req.params.id }).first();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

module.exports = router;
