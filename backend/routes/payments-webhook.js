/**
 * Stripe Webhook Handler
 *
 * This handles asynchronous payment events from Stripe.
 * In production, this is the most reliable way to confirm payments.
 *
 * Note: This route is mounted in server.js BEFORE express.json() middleware
 * because Stripe requires the raw request body for signature verification.
 */
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If no webhook secret configured, skip verification (dev only)
  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set — skipping webhook signature verification');
    return res.json({ received: true });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      // In production, you would update the order status here
      // const db = req.app.locals.db;
      // await db('orders').where({ payment_id: paymentIntent.id }).update({ status: 'paid' });
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log(`Payment failed: ${paymentIntent.id}`);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};
