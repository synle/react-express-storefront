/**
 * Stripe Webhook Handler
 *
 * Handles asynchronous payment events from Stripe.
 * In production, this is the most reliable way to confirm payments.
 *
 * Note: This route is mounted in server.js BEFORE express.json() middleware
 * because Stripe requires the raw request body for signature verification.
 */

module.exports = async function stripeWebhook(req, res) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  // If Stripe is not configured, just acknowledge
  if (!secretKey || /x{6,}/.test(secretKey)) {
    return res.json({ received: true });
  }

  const stripe = require('stripe')(secretKey);
  const sig = req.headers['stripe-signature'];

  // If no webhook secret configured, skip verification (dev only)
  if (!webhookSecret || /x{6,}/.test(webhookSecret)) {
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

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`Payment succeeded: ${paymentIntent.id}`);
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
