import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paymentsApi } from '../api';

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentsApi.getOrder(id)
      .then(setOrder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container loading">Loading order...</div>;

  if (!order) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>Order not found</h2>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="order-confirmation">
        <div className="order-success-icon">&#10003;</div>
        <h1>Order Confirmed!</h1>
        <p className="order-id">Order ID: {order.id}</p>

        <div className="order-details-card">
          <h2>Order Details</h2>

          <div className="order-meta">
            <div>
              <strong>Status:</strong>{' '}
              <span className="order-status">{order.status}</span>
            </div>
            <div>
              <strong>Payment:</strong> {
                { stripe: 'Card (Stripe)', paypal: 'PayPal', demo: 'Test Card (Demo)' }[order.payment_method] || order.payment_method
              }
            </div>
            <div>
              <strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}
            </div>
          </div>

          <table className="order-items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map(item => (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>{item.quantity}</td>
                  <td>${parseFloat(item.price).toFixed(2)}</td>
                  <td>${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3"><strong>Total</strong></td>
                <td><strong>${parseFloat(order.total).toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <Link to="/" className="btn btn-primary">Continue Shopping</Link>
      </div>
    </div>
  );
}
