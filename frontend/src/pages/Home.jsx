import { useState, useEffect } from 'react';
import { productsApi } from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    productsApi.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (search) params.search = search;
    if (category) params.category = category;

    productsApi.list(params)
      .then(data => {
        setProducts(data.products);
        setPagination(data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, page]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, category]);

  return (
    <div className="container">
      <div className="home-header">
        <h1>Products</h1>
        <div className="home-filters">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="category-select"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p>No products found{search ? ` for "${search}"` : ''}.</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn btn-outline"
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
