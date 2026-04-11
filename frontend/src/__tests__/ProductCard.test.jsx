import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import ProductCard from '../components/ProductCard';

beforeEach(() => {
  localStorage.clear();
});

function renderCard(productOverrides = {}) {
  const product = {
    id: 1,
    name: 'Wireless Headphones',
    price: 79.99,
    image: 'https://example.com/headphones.jpg',
    category: 'Electronics',
    stock: 50,
    ...productOverrides
  };

  return render(
    <MemoryRouter>
      <CartProvider>
        <ProductCard product={product} />
      </CartProvider>
    </MemoryRouter>
  );
}

describe('ProductCard', () => {
  test('renders product name', () => {
    renderCard();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  test('renders product price formatted to 2 decimal places', () => {
    renderCard();
    expect(screen.getByText('$79.99')).toBeInTheDocument();
  });

  test('renders category', () => {
    renderCard();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  test('renders product image with alt text', () => {
    renderCard();
    const img = screen.getByAltText('Wireless Headphones');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/headphones.jpg');
  });

  test('renders "Add to Cart" button when in stock', () => {
    renderCard({ stock: 10 });
    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    expect(screen.getByText('Add to Cart')).not.toBeDisabled();
  });

  test('renders disabled "Out of Stock" button when stock is 0', () => {
    renderCard({ stock: 0 });
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeDisabled();
  });

  test('has a link to product detail page', () => {
    renderCard();
    const links = screen.getAllByRole('link');
    const detailLink = links.find(l => l.getAttribute('href') === '/product/1');
    expect(detailLink).toBeDefined();
  });

  test('adds product to cart on button click', async () => {
    const user = userEvent.setup();
    renderCard();

    const btn = screen.getByText('Add to Cart');
    await user.click(btn);

    const cart = JSON.parse(localStorage.getItem('cart'));
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe(1);
    expect(cart[0].quantity).toBe(1);
  });
});
