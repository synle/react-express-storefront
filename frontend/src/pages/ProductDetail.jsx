import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsApi } from '../api';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    productsApi.getById(id)
      .then(setProduct)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function handleAddToCart() {
    if (!product) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return <div className="container loading">Loading...</div>;
  if (!product) return null;

  return (
    <div className="container">
      <button className="btn btn-outline back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="product-detail">
        <div className="product-detail-image-wrap">
          <img src={product.image} alt={product.name} className="product-detail-image" />
        </div>

        <div className="product-detail-info">
          <span className="product-card-category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="product-detail-price">${product.price.toFixed(2)}</p>
          <p className="product-detail-description">{product.description}</p>

          <div className="product-detail-stock">
            {product.stock > 0
              ? <span className="in-stock">{product.stock} in stock</span>
              : <span className="out-of-stock">Out of stock</span>
            }
          </div>

          {product.stock > 0 && (
            <div className="product-detail-actions">
              <div className="quantity-selector">
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleAddToCart}>
                {added ? 'Added!' : 'Add to Cart'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
