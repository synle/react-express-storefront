import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';

export default function Cart() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container">
        <h1>Shopping Cart</h1>
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link to="/" className="btn btn-primary">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Shopping Cart</h1>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map(item => (
            <CartItem key={item.productId} item={item} />
          ))}
          <button className="btn btn-outline btn-sm" onClick={clearCart}>
            Clear Cart
          </button>
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>
          <div className="cart-summary-row">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="cart-summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <hr />
          <div className="cart-summary-row cart-summary-total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
