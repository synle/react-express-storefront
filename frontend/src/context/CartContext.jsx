import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

/**
 * Cart is stored client-side in localStorage for simplicity.
 * Each item: { productId, name, price, image, quantity, stock }
 *
 * When the user is logged in, the cart also syncs to the server
 * (via the cart API), but localStorage is the source of truth
 * for the UI to keep things fast and offline-capable.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, i.stock) }
            : i
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
        stock: product.stock
      }];
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    setItems(prev =>
      prev.map(i =>
        i.productId === productId
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i
      )
    );
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      itemCount,
      total
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
