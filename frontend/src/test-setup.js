import '@testing-library/jest-dom';

// Mock fetch globally for tests that don't provide their own mock
if (!globalThis.fetch.__mocked) {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({})
    })
  );
  globalThis.fetch.__mocked = true;
}

// Mock Google Identity Services (not available in jsdom)
globalThis.google = {
  accounts: {
    id: {
      initialize: vi.fn(),
      renderButton: vi.fn(),
      prompt: vi.fn()
    }
  }
};
