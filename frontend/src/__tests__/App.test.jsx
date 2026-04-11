import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
});

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('App', () => {
  test('renders without crashing', () => {
    renderApp();
    // Should at least render the navbar brand
    expect(screen.getByText('ShopSimple')).toBeInTheDocument();
  });

  test('renders navbar with navigation links', () => {
    renderApp();
    // "Products" appears in both navbar and page heading, so use getAllByText
    expect(screen.getAllByText('Products').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  test('renders Sign In link when not authenticated', () => {
    renderApp();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  test('renders footer', () => {
    renderApp();
    expect(screen.getByText(/Stripe \+ PayPal/)).toBeInTheDocument();
  });

  test('shows login page on /login route', () => {
    renderApp('/login');
    // The login page has a heading
    expect(screen.getAllByText('Sign In').length).toBeGreaterThanOrEqual(1);
  });

  test('shows cart page on /cart route', () => {
    renderApp('/cart');
    expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
  });
});
