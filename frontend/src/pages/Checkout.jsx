import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import { paymentsApi } from '../api';

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
      // Create order in our backend
      try {
        const order = await paymentsApi.stripeConfirmOrder({
          paymentIntentId: paymentIntent.id,
          items
        });
        onSuccess(order.orderId);
      } catch (err) {
        setError('Payment succeeded but order creation failed. Please contact support.');
      }
    }
    setProcessing(false);
  }

  return (
    <form onSubmit={handleSubmit} className="stripe-form">
      <PaymentElement />
      {error && <div className="payment-error">{error}</div>}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  // Fetch payment config and create Stripe PaymentIntent
  useEffect(() => {
    if (items.length === 0) return;

    async function init() {
      try {
        const config = await paymentsApi.getConfig();
        setPaymentConfig(config);

        // Initialize Stripe
        if (config.stripePublishableKey) {
          stripePromise = loadStripe(config.stripePublishableKey);
        }

        // Create PaymentIntent
        const cartItems = items.map(i => ({
          productId: i.productId,
          quantity: i.quantity
        }));

        const intent = await paymentsApi.stripeCreateIntent(cartItems);
        setClientSecret(intent.clientSecret);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [items]);

  function handleSuccess(orderId) {
    clearCart();
    navigate(`/order/${orderId}`);
  }

  if (items.length === 0) return null;

  if (loading) {
    return <div className="container loading">Preparing checkout...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="payment-error-page">
          <h2>Checkout Error</h2>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/cart')}>
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  const cartItems = items.map(i => ({
    productId: i.productId,
    quantity: i.quantity
  }));

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

          <div className="payment-tabs">
            <button
              className={`payment-tab ${paymentMethod === 'stripe' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('stripe')}
            >
              Card / Google Pay / Apple Pay
            </button>
            <button
              className={`payment-tab ${paymentMethod === 'paypal' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('paypal')}
            >
              PayPal
            </button>
          </div>

          {/* Stripe Payment (includes Card, Google Pay, Apple Pay) */}
          {paymentMethod === 'stripe' && clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#2563eb' }
                }
              }}
            >
              <StripeForm
                clientSecret={clientSecret}
                items={cartItems}
                onSuccess={handleSuccess}
              />
            </Elements>
          )}

          {/* PayPal Payment */}
          {paymentMethod === 'paypal' && paymentConfig?.paypalClientId && (
            <PayPalScriptProvider options={{
              'client-id': paymentConfig.paypalClientId,
              currency: 'USD'
            }}>
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
