import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="cart-item">
      <Link to={`/product/${item.productId}`}>
        <img src={item.image} alt={item.name} className="cart-item-image" />
      </Link>
      <div className="cart-item-details">
        <Link to={`/product/${item.productId}`} className="cart-item-name">
          {item.name}
        </Link>
        <span className="cart-item-price">${item.price.toFixed(2)}</span>
      </div>
      <div className="cart-item-quantity">
        <button
          className="qty-btn"
          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          -
        </button>
        <span className="qty-value">{item.quantity}</span>
        <button
          className="qty-btn"
          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          disabled={item.quantity >= item.stock}
        >
          +
        </button>
      </div>
      <div className="cart-item-subtotal">
        ${(item.price * item.quantity).toFixed(2)}
      </div>
      <button className="cart-item-remove" onClick={() => removeItem(item.productId)}>
        &times;
      </button>
    </div>
  );
}
