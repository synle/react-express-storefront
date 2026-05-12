# react-express-storefront — Architecture

## High-Level Overview

A two-tier e-commerce demo composed of:

- **Frontend** — a React 18 SPA built with Vite. Client-side routing via `react-router-dom`. Application state for auth and cart is held in React Context (`AuthContext`, `CartContext`). All server I/O flows through a single `fetch`-based API client (`frontend/src/api.js`).
- **Backend** — an Express 4 JSON API. Persistence is handled through Knex, with SQLite as the default driver and Postgres/MySQL configurations available. Authentication uses Google Sign-In, with the server issuing a JWT that the SPA attaches as a `Bearer` token on subsequent requests. Payments integrate Stripe (Payment Intents + webhook) and PayPal Orders.

**Frontend ↔ Backend communication.** The SPA calls REST endpoints under `/api/*`. In development, Vite proxies `/api` to `http://localhost:3001`, so the two halves can be served on different ports without CORS complications. In other environments, CORS is enabled on the backend and scoped to `FRONTEND_URL`. JWTs are stored in `localStorage` and attached via an `Authorization` header.

**Data model (Knex migrations).**

- `users` — UUID primary key, Google `sub` claim, email/name/picture.
- `products` — auto-increment id, name, price, category, stock, image URL.
- `orders` — UUID primary key, total, status (`pending`/`paid`/`shipped`/`cancelled`), `payment_method` (`stripe`/`paypal`), `payment_id`, JSON `shipping_address`.
- `order_items` — line items snapshotting product name and price at purchase time.
- `cart_items` — server-side cart for logged-in users, uniqued on `(user_id, product_id)`.

## Key Directories

```
backend/
  routes/        Express routers: auth, products, cart, payments, payments-webhook
  middleware/    Auth middleware (JWT verification)
  db/
    migrations/  Knex migrations (schema is dialect-portable)
    seeds/       Sample product seed data
  tests/         Jest unit + integration tests (Supertest)
frontend/
  src/
    components/  Navbar, ProductCard, CartItem
    pages/       Home, ProductDetail, Cart, Checkout, Login, OrderConfirmation
    context/     AuthContext, CartContext
    __tests__/   Vitest + Testing Library tests
.github/workflows/  ci.yml, pr-check.yml, release.yml
```

## Important Files

**Backend**

- `backend/server.js` — process entry. Loads env, builds the Knex instance, runs `migrate.latest()` and (on empty DB) `seed.run()`, then calls `createApp(db).listen(PORT)`.
- `backend/app.js` — Express factory. Mounts the Stripe webhook with `express.raw` before `express.json()`, applies CORS, then mounts `/api/auth`, `/api/products`, `/api/cart`, `/api/payments`, and `/api/health`. The Knex instance is attached as `app.locals.db` so tests can inject a fresh in-memory database.
- `backend/knexfile.js` — environment-keyed Knex configs: `development` (SQLite), `postgres`, `mysql`, `production` (Postgres with optional SSL).
- `backend/routes/auth.js` — `POST /api/auth/google` (verifies Google ID token, upserts user, returns JWT) and `GET /api/auth/me`.
- `backend/routes/products.js` — product list with filters, single product lookup, categories.
- `backend/routes/cart.js` — server-side cart CRUD, requires auth.
- `backend/routes/payments.js` — Stripe `create-payment-intent` / `confirm-order`, PayPal `create-order` / `capture-order`, demo pay, order lookup.
- `backend/routes/payments-webhook.js` — Stripe webhook handler; mounted with raw body so signature verification works.
- `backend/middleware/auth.js` — JWT verification middleware.
- `backend/db/migrations/20240101000000_initial.js` — the canonical schema (users, products, orders, order_items, cart_items).
- `backend/package.json` — Express 4, Knex 3, better-sqlite3, stripe, jsonwebtoken, google-auth-library; Jest + Supertest for tests.

**Frontend**

- `frontend/index.html` + `frontend/src/main.jsx` — Vite entry; wraps `<App>` in `BrowserRouter`, `AuthProvider`, `CartProvider`.
- `frontend/src/App.jsx` — top-level route table for the six pages.
- `frontend/src/api.js` — single REST client. Exports `authApi`, `productsApi`, `cartApi`, `paymentsApi`. Auto-attaches `Authorization: Bearer <token>` from `localStorage`.
- `frontend/src/context/AuthContext.jsx` / `CartContext.jsx` — global state providers consumed across pages.
- `frontend/vite.config.js` — dev server + `/api` proxy to the Express backend.
- `frontend/package.json` — React 18, react-router-dom 6, Stripe and PayPal React SDKs; Vite 5, Vitest, Testing Library.

## Build & Release Flow

**Local builds.** Backend runs with `npm start` (or `npm run dev` for `node --watch`); migrations and seeds run automatically on first boot. Frontend dev server runs with `npm run dev`; production bundle with `npm run build`, output in `frontend/dist/`.

**Continuous Integration.** `.github/workflows/ci.yml` and `pr-check.yml` install dependencies for both packages and run `jest` (backend) and `vitest run` (frontend) on push and pull requests.

**Release.** `.github/workflows/release.yml` is a `workflow_dispatch` job taking a `tag` input (e.g. `v1.0.1`) and release notes. It installs both packages, runs backend tests, builds the frontend, then tars two artifacts:

- `storefront-frontend-<tag>.tar.gz` — the built `frontend/dist/` directory.
- `storefront-backend-<tag>.tar.gz` — the `backend/` source tree, excluding `node_modules` and `coverage`.

Both are attached to a published GitHub Release via `softprops/action-gh-release`. The `tag` input is required (no derived-from-branch fallback), so dispatches must pass an explicit `v*` semver tag.
