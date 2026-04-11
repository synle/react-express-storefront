/**
 * API client for the backend.
 * All requests go through the Vite proxy in dev (/api → localhost:3001).
 */
const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...options.headers
    },
    ...options
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}

// --- Auth ---
export const authApi = {
  googleLogin: (credential) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    }),
  getMe: () => request('/auth/me')
};

// --- Products ---
export const productsApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/products/${id}`),
  getCategories: () => request('/products/categories')
};

// --- Cart (server-side) ---
export const cartApi = {
  get: () => request('/cart'),
  add: (productId, quantity = 1) =>
    request('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    }),
  update: (id, quantity) =>
    request(`/cart/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    }),
  remove: (id) =>
    request(`/cart/${id}`, { method: 'DELETE' }),
  clear: () =>
    request('/cart', { method: 'DELETE' })
};

// --- Payments ---
export const paymentsApi = {
  getConfig: () => request('/payments/config'),
  demoPay: (items, card) =>
    request('/payments/demo/pay', {
      method: 'POST',
      body: JSON.stringify({ items, card })
    }),
  stripeCreateIntent: (items) =>
    request('/payments/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ items })
    }),
  stripeConfirmOrder: (data) =>
    request('/payments/stripe/confirm-order', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  paypalCreateOrder: (items) =>
    request('/payments/paypal/create-order', {
      method: 'POST',
      body: JSON.stringify({ items })
    }),
  paypalCaptureOrder: (data) =>
    request('/payments/paypal/capture-order', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getOrder: (id) => request(`/payments/orders/${id}`)
};
