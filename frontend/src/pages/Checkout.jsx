import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import { paymentsApi } from '../api';

// =============================================
// DEMO Payment Form (works with zero config)
// =============================================
function DemoForm({ items, onSuccess }) {
  const [card, setCard] = useState({
    number: '4242 4242 4242 4242',
    exp: '12/29',
    cvc: '123'
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setProcessing(true);
    setError(null);
    try {
      const result = await paymentsApi.demoPay(items, card);
      onSuccess(result.orderId);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="demo-payment-form">
      <div className="demo-banner">
        Demo Mode — no real charges. Edit card fields or use defaults.
      </div>

      <div className="form-group">
        <label>Card Number</label>
        <input
          type="text"
          value={card.number}
          onChange={e => setCard({ ...card, number: e.target.value })}
          placeholder="4242 4242 4242 4242"
          className="form-input"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Expiry</label>
          <input
            type="text"
            value={card.exp}
            onChange={e => setCard({ ...card, exp: e.target.value })}
            placeholder="MM/YY"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label>CVC</label>
          <input
            type="text"
            value={card.cvc}
            onChange={e => setCard({ ...card, cvc: e.target.value })}
            placeholder="123"
            className="form-input"
          />
        </div>
      </div>

      <div className="demo-test-cards">
        <strong>Test scenarios:</strong>
        <div>
          <code>4242 4242 4242 4242</code> — Success
        </div>
        <div>
          <code>4000 0000 0000 0002</code> — Declined
        </div>
      </div>

      {error && <div className="payment-error">{error}</div>}

      <button type="submit" className="btn btn-primary btn-block" disabled={processing}>
        {processing ? 'Processing...' : 'Pay Now (Demo)'}
      </button>
    </form>
  );
}

// =============================================
// STRIPE Payment Form
// =============================================
let stripePromise = null;

function StripeForm({ clientSecret, items, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: 'if_required'
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      try {
        const order = await paymentsApi.stripeConfirmOrder({
          paymentIntentId: paymentIntent.id,
          items
        });
        onSuccess(order.orderId);
      } catch (err) {
        setError('Payment succeeded but order creation failed. Contact support.');
      }
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <PaymentElement />
      {error && <div className="payment-error">{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={!stripe || processing}>
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

// =============================================
// CHECKOUT PAGE
// =============================================
export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);  // set after config loads
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items, navigate]);

  // Load payment config on mount
  useEffect(() => {
    if (items.length === 0) return;
    paymentsApi.getConfig()
      .then(cfg => {
        setConfig(cfg);
        // Pick the first available method as default
        if (cfg.demoMode) {
          setPaymentMethod('demo');
        } else if (cfg.stripeEnabled) {
          setPaymentMethod('stripe');
        } else if (cfg.paypalEnabled) {
          setPaymentMethod('paypal');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [items]);

  // Create Stripe PaymentIntent when Stripe is selected
  useEffect(() => {
    if (paymentMethod !== 'stripe' || !config?.stripeEnabled || items.length === 0) return;

    stripePromise = loadStripe(config.stripePublishableKey);
    const cartItems = items.map(i => ({ productId: i.productId, quantity: i.quantity }));

    paymentsApi.stripeCreateIntent(cartItems)
      .then(res => setClientSecret(res.clientSecret))
      .catch(err => setError(err.message));
  }, [paymentMethod, config, items]);

  function handleSuccess(orderId) {
    clearCart();
    navigate(`/order/${orderId}`);
  }

  if (items.length === 0) return null;
  if (loading) return <div className="container loading">Preparing checkout...</div>;
  if (error && !config) {
    return (
      <div className="container">
        <div className="payment-error-page">
          <h2>Checkout Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/cart')}>Back to Cart</button>
        </div>
      </div>
    );
  }

  const cartItems = items.map(i => ({ productId: i.productId, quantity: i.quantity }));

  // Build available tabs
  const tabs = [];
  if (config?.demoMode) tabs.push({ key: 'demo', label: 'Test Card (Demo)' });
  if (config?.stripeEnabled) tabs.push({ key: 'stripe', label: 'Card / Google Pay / Apple Pay' });
  if (config?.paypalEnabled) tabs.push({ key: 'paypal', label: 'PayPal' });

  return (
    <div className="container">
      <h1>Checkout</h1>

      <div className="checkout-layout">
        {/* Order summary */}
        <div className="checkout-summary">
          <h2>Order Summary</h2>
          {items.map(item => (
            <div key={item.productId} className="checkout-item">
              <span>{item.name} x {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <hr />
          <div className="checkout-item checkout-total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment methods */}
        <div className="checkout-payment">
          <h2>Payment Method</h2>

          {tabs.length > 1 && (
            <div className="payment-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`payment-tab ${paymentMethod === tab.key ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {error && <div className="payment-error">{error}</div>}

          {/* DEMO */}
          {paymentMethod === 'demo' && (
            <DemoForm items={cartItems} onSuccess={handleSuccess} />
          )}

          {/* STRIPE */}
          {paymentMethod === 'stripe' && clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: 'stripe', variables: { colorPrimary: '#2563eb' } }
              }}
            >
              <StripeForm clientSecret={clientSecret} items={cartItems} onSuccess={handleSuccess} />
            </Elements>
          )}
          {paymentMethod === 'stripe' && !clientSecret && (
            <div className="loading">Loading Stripe...</div>
          )}

          {/* PAYPAL */}
          {paymentMethod === 'paypal' && config?.paypalClientId && (
            <PayPalScriptProvider options={{ 'client-id': config.paypalClientId, currency: 'USD' }}>
              <div className="paypal-buttons-wrapper">
                <PayPalButtons
                  style={{ layout: 'vertical', label: 'pay' }}
                  createOrder={async () => {
                    const result = await paymentsApi.paypalCreateOrder(cartItems);
                    return result.orderID;
                  }}
                  onApprove={async (data) => {
                    const result = await paymentsApi.paypalCaptureOrder({
                      orderID: data.orderID,
                      items: cartItems
                    });
                    handleSuccess(result.orderId);
                  }}
                  onError={(err) => {
                    console.error('PayPal error:', err);
                    setError('PayPal payment failed. Please try again.');
                  }}
                />
              </div>
            </PayPalScriptProvider>
          )}
        </div>
      </div>
    </div>
  );
}
