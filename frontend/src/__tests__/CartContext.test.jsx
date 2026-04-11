import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

// Clear localStorage before each test
beforeEach(() => {
  localStorage.clear();
});

function renderCartHook() {
  return renderHook(() => useCart(), { wrapper: CartProvider });
}

const mockProduct = {
  id: 1,
  name: 'Test Widget',
  price: 29.99,
  image: '/test.jpg',
  stock: 10
};

const mockProduct2 = {
  id: 2,
  name: 'Other Widget',
  price: 49.99,
  image: '/test2.jpg',
  stock: 5
};

// ================================================
// addItem
// ================================================
describe('addItem', () => {
  test('adds a product to empty cart', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(1);
    expect(result.current.items[0].name).toBe('Test Widget');
    expect(result.current.items[0].quantity).toBe(1);
  });

  test('increments quantity when adding existing product', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));
    act(() => result.current.addItem(mockProduct, 2));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(3);
  });

  test('caps quantity at stock level', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 8));
    act(() => result.current.addItem(mockProduct, 8));

    expect(result.current.items[0].quantity).toBe(10); // stock is 10
  });

  test('adds multiple different products', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));
    act(() => result.current.addItem(mockProduct2, 2));

    expect(result.current.items).toHaveLength(2);
  });
});

// ================================================
// updateQuantity
// ================================================
describe('updateQuantity', () => {
  test('updates quantity of an item', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));
    act(() => result.current.updateQuantity(1, 5));

    expect(result.current.items[0].quantity).toBe(5);
  });

  test('does not allow quantity below 1', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 3));
    act(() => result.current.updateQuantity(1, 0));

    expect(result.current.items[0].quantity).toBe(3); // unchanged
  });

  test('caps at stock level', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));
    act(() => result.current.updateQuantity(1, 999));

    expect(result.current.items[0].quantity).toBe(10); // stock is 10
  });
});

// ================================================
// removeItem
// ================================================
describe('removeItem', () => {
  test('removes an item from cart', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));
    act(() => result.current.addItem(mockProduct2, 1));
    act(() => result.current.removeItem(1));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe(2);
  });
});

// ================================================
// clearCart
// ================================================
describe('clearCart', () => {
  test('removes all items', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));
    act(() => result.current.addItem(mockProduct2, 3));
    act(() => result.current.clearCart());

    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.total).toBe(0);
  });
});

// ================================================
// computed values
// ================================================
describe('computed: itemCount and total', () => {
  test('calculates correct item count', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 2));
    act(() => result.current.addItem(mockProduct2, 3));

    expect(result.current.itemCount).toBe(5); // 2 + 3
  });

  test('calculates correct total', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 2));   // 29.99 * 2 = 59.98
    act(() => result.current.addItem(mockProduct2, 1));   // 49.99 * 1 = 49.99

    const expected = 29.99 * 2 + 49.99;
    expect(result.current.total).toBeCloseTo(expected);
  });
});

// ================================================
// localStorage persistence
// ================================================
describe('localStorage persistence', () => {
  test('persists cart to localStorage', () => {
    const { result } = renderCartHook();

    act(() => result.current.addItem(mockProduct, 1));

    const stored = JSON.parse(localStorage.getItem('cart'));
    expect(stored).toHaveLength(1);
    expect(stored[0].productId).toBe(1);
  });

  test('loads cart from localStorage on mount', () => {
    localStorage.setItem('cart', JSON.stringify([
      { productId: 7, name: 'Saved Item', price: 15, image: '/x.jpg', quantity: 2, stock: 10 }
    ]));

    const { result } = renderCartHook();

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Saved Item');
  });
});
