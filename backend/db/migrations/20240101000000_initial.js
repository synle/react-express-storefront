/**
 * Initial database schema.
 *
 * This migration is written to be compatible with SQLite, PostgreSQL, and MySQL.
 * Knex abstracts the SQL dialect differences for us.
 */
exports.up = function (knex) {
  return knex.schema
    // --- Users ---
    .createTable('users', (t) => {
      t.string('id', 36).primary();             // UUID
      t.string('email').notNullable().unique();
      t.string('name');
      t.string('picture');                       // profile photo URL
      t.string('google_id').unique();            // Google sub claim
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // --- Products ---
    .createTable('products', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.text('description');
      t.decimal('price', 10, 2).notNullable();
      t.string('image');                         // URL to product image
      t.string('category');
      t.integer('stock').defaultTo(0);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // --- Orders ---
    .createTable('orders', (t) => {
      t.string('id', 36).primary();             // UUID
      t.string('user_id', 36).references('id').inTable('users').onDelete('SET NULL');
      t.string('status').defaultTo('pending');   // pending, paid, shipped, cancelled
      t.decimal('total', 10, 2).notNullable();
      t.string('payment_method');                // stripe, paypal
      t.string('payment_id');                    // Stripe PaymentIntent ID or PayPal Order ID
      t.text('shipping_address');                // JSON string
      t.string('email');                         // for guest checkout
      t.timestamp('created_at').defaultTo(knex.fn.now());
    })

    // --- Order Items ---
    .createTable('order_items', (t) => {
      t.increments('id').primary();
      t.string('order_id', 36).references('id').inTable('orders').onDelete('CASCADE');
      t.integer('product_id').references('id').inTable('products').onDelete('SET NULL');
      t.integer('quantity').notNullable();
      t.decimal('price', 10, 2).notNullable();  // price at time of purchase
      t.string('product_name');                  // snapshot of product name
    })

    // --- Cart Items (server-side cart for logged-in users) ---
    .createTable('cart_items', (t) => {
      t.increments('id').primary();
      t.string('user_id', 36).references('id').inTable('users').onDelete('CASCADE');
      t.integer('product_id').references('id').inTable('products').onDelete('CASCADE');
      t.integer('quantity').notNullable().defaultTo(1);
      t.unique(['user_id', 'product_id']);
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('cart_items')
    .dropTableIfExists('order_items')
    .dropTableIfExists('orders')
    .dropTableIfExists('products')
    .dropTableIfExists('users');
};
