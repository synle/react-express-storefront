/**
 * Seed the products table with sample data.
 */
exports.seed = async function (knex) {
  await knex('cart_items').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('products').del();

  await knex('products').insert([
    // --- Electronics ---
    {
      name: 'Wireless Headphones',
      description: 'Premium over-ear wireless headphones with active noise cancellation. 30-hour battery life, Bluetooth 5.3, and ultra-comfortable memory foam ear cushions.',
      price: 79.99,
      image: 'https://picsum.photos/seed/headphones/400/400',
      category: 'Electronics',
      stock: 50
    },
    {
      name: 'Smart Watch',
      description: 'Feature-packed smartwatch with heart rate monitoring, GPS, sleep tracking, and 5-day battery life. Water resistant to 50m.',
      price: 199.99,
      image: 'https://picsum.photos/seed/smartwatch/400/400',
      category: 'Electronics',
      stock: 30
    },
    {
      name: 'Bluetooth Speaker',
      description: 'Portable Bluetooth speaker with 360-degree sound, IPX7 waterproof rating, and 12-hour playtime. Perfect for outdoor adventures.',
      price: 49.99,
      image: 'https://picsum.photos/seed/speaker/400/400',
      category: 'Electronics',
      stock: 75
    },
    {
      name: 'USB-C Hub',
      description: '7-in-1 USB-C hub with HDMI 4K output, 3x USB 3.0, SD card reader, and 100W power delivery pass-through.',
      price: 34.99,
      image: 'https://picsum.photos/seed/usbhub/400/400',
      category: 'Electronics',
      stock: 100
    },

    // --- Clothing ---
    {
      name: 'Classic Cotton T-Shirt',
      description: '100% organic cotton crew neck t-shirt. Pre-shrunk, soft-washed for comfort. Available in multiple colors.',
      price: 24.99,
      image: 'https://picsum.photos/seed/tshirt/400/400',
      category: 'Clothing',
      stock: 200
    },
    {
      name: 'Denim Jacket',
      description: 'Vintage-style denim jacket made from heavyweight 13oz selvedge denim. Classic fit with button closure.',
      price: 89.99,
      image: 'https://picsum.photos/seed/denim/400/400',
      category: 'Clothing',
      stock: 40
    },
    {
      name: 'Running Shoes',
      description: 'Lightweight running shoes with responsive cushioning, breathable mesh upper, and durable rubber outsole.',
      price: 119.99,
      image: 'https://picsum.photos/seed/shoes/400/400',
      category: 'Clothing',
      stock: 60
    },
    {
      name: 'Canvas Backpack',
      description: 'Durable canvas backpack with padded laptop compartment (fits 15"), multiple pockets, and adjustable straps.',
      price: 59.99,
      image: 'https://picsum.photos/seed/backpack/400/400',
      category: 'Clothing',
      stock: 45
    },

    // --- Home ---
    {
      name: 'Ceramic Mug Set',
      description: 'Set of 4 handcrafted ceramic mugs. Microwave and dishwasher safe. 12oz capacity each.',
      price: 29.99,
      image: 'https://picsum.photos/seed/mugs/400/400',
      category: 'Home',
      stock: 80
    },
    {
      name: 'LED Desk Lamp',
      description: 'Adjustable LED desk lamp with 5 brightness levels, 3 color temperatures, USB charging port, and touch controls.',
      price: 44.99,
      image: 'https://picsum.photos/seed/lamp/400/400',
      category: 'Home',
      stock: 55
    },
    {
      name: 'Minimalist Plant Pot',
      description: 'Modern matte ceramic plant pot with bamboo saucer. Drainage hole included. Perfect for succulents and small plants.',
      price: 19.99,
      image: 'https://picsum.photos/seed/plantpot/400/400',
      category: 'Home',
      stock: 120
    },
    {
      name: 'Cozy Throw Blanket',
      description: 'Ultra-soft microfiber throw blanket, 50"x60". Machine washable, lightweight yet warm. Great for couch or bed.',
      price: 39.99,
      image: 'https://picsum.photos/seed/blanket/400/400',
      category: 'Home',
      stock: 90
    }
  ]);
};
