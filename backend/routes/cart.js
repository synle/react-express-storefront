const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All cart routes require authentication
router.use(requireAuth);

/**
 * GET /api/cart
 * Get current user's cart with product details.
 */
router.get('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const items = await db('cart_items')
      .join('products', 'cart_items.product_id', 'products.id')
      .where({ 'cart_items.user_id': req.user.id })
      .select(
        'cart_items.id',
        'cart_items.product_id',
        'cart_items.quantity',
        'products.name',
        'products.price',
        'products.image',
        'products.stock'
      );

    res.json(items);
  } catch (err) {
    console.error('Cart fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

/**
 * POST /api/cart
 * Add an item to the cart (or increase quantity if already in cart).
 * Body: { productId: 1, quantity: 1 }
 */
router.post('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { productId, quantity = 1 } = req.body;

    // Verify product exists and has stock
    const product = await db('products').where({ id: productId }).first();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if item already in cart
    const existing = await db('cart_items')
      .where({ user_id: req.user.id, product_id: productId })
      .first();

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        return res.status(400).json({ error: 'Not enough stock' });
      }
      await db('cart_items').where({ id: existing.id }).update({ quantity: newQty });
    } else {
      if (quantity > product.stock) {
        return res.status(400).json({ error: 'Not enough stock' });
      }
      await db('cart_items').insert({
        user_id: req.user.id,
        product_id: productId,
        quantity
      });
    }

    res.json({ message: 'Item added to cart' });
  } catch (err) {
    console.error('Cart add error:', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

/**
 * PUT /api/cart/:id
 * Update quantity of a cart item.
 * Body: { quantity: 3 }
 */
router.put('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const item = await db('cart_items')
      .where({ id: req.params.id, user_id: req.user.id })
      .first();

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    const product = await db('products').where({ id: item.product_id }).first();
    if (quantity > product.stock) {
      return res.status(400).json({ error: 'Not enough stock' });
    }

    await db('cart_items').where({ id: req.params.id }).update({ quantity });
    res.json({ message: 'Cart updated' });
  } catch (err) {
    console.error('Cart update error:', err);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

/**
 * DELETE /api/cart/:id
 * Remove an item from the cart.
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = req.app.locals.db;
    const deleted = await db('cart_items')
      .where({ id: req.params.id, user_id: req.user.id })
      .del();

    if (!deleted) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error('Cart delete error:', err);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

/**
 * DELETE /api/cart
 * Clear entire cart.
 */
router.delete('/', async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db('cart_items').where({ user_id: req.user.id }).del();
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('Cart clear error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

module.exports = router;
