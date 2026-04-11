import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`}>
        <img src={product.image} alt={product.name} className="product-card-image" />
      </Link>
      <div className="product-card-body">
        <span className="product-card-category">{product.category}</span>
        <Link to={`/product/${product.id}`} className="product-card-title">
          {product.name}
        </Link>
        <div className="product-card-footer">
          <span className="product-card-price">${product.price.toFixed(2)}</span>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => addItem(product)}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
