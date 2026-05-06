# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A small full-stack e-commerce app — internally branded **ShopSimple** — split into two services:

- `backend/` — Node.js + Express REST API (port 4000), Knex.js → SQLite (swappable to Postgres/MySQL).
- `frontend/` — React 18 + Vite (port 5173) with React Router and Context-based state.

Implements products, cart, Google Sign-In auth, checkout, and a payments layer wired for Stripe / PayPal / Google Pay / Apple Pay.

## Build & Development Commands

```bash
# Backend (run from backend/)
npm install
npm run migrate              # Knex: create db.sqlite from db/migrations/
npm run seed                 # Load demo products from db/seeds/
npm start                    # Express on :4000
npm test                     # Jest: tests/integration + tests/unit

# Frontend (run from frontend/)
npm install
npm run dev                  # Vite dev server on :5173 (proxies /api → :4000)
npm run build                # Production bundle → dist/
npm test                     # Vitest + React Testing Library
```

Both directories have their own `.env.example` — copy to `.env` and fill in Stripe / PayPal / Google keys before running.

## Architecture

**Backend** (`backend/`):
- Entry: `server.js` (binds to port) → delegates to `app.js` (Express app).
- Routes mounted in `app.js`:
  - `routes/auth.js` — `/api/auth/google` verifies a Google ID token, issues a JWT.
  - `routes/products.js` — `/api/products` list/search/by-id (no auth).
  - `routes/cart.js` — `/api/cart` CRUD (JWT-gated via `middleware/auth.js`).
  - `routes/payments.js` — `/api/payments/stripe`, `/api/payments/paypal` create payment intents / orders.
  - `routes/payments-webhook.js` — `/api/payments/webhook` handles Stripe webhook signatures.
- DB: Knex configured in `knexfile.js`. Default is SQLite at `backend/db.sqlite`. Migrations in `db/migrations/`, seeds in `db/seeds/`.
- Tests: `tests/unit/` (mocked), `tests/integration/` (real DB via `tests/helpers.js` setup/teardown). `tests/env-setup.js` loads `.env.test`.

**Frontend** (`frontend/`):
- Entry: `src/main.jsx` → `App.jsx` (router shell with `Navbar` + `<Outlet>`).
- Pages in `src/pages/`: `Home`, `ProductDetail`, `Cart`, `Checkout`, `Login`, `OrderConfirmation`.
- Components in `src/components/`: `ProductCard`, `CartItem`, `Navbar`.
- Context: `src/context/AuthContext.jsx` (JWT, login state) + `CartContext.jsx` (cart items, persisted to localStorage).
- API client: `src/api.js` — single fetch wrapper that injects `Authorization: Bearer <jwt>` from AuthContext.

## Key Files

| File | Role |
|---|---|
| `backend/app.js` | Express app, route mounting, middleware chain |
| `backend/server.js` | Process entry, port binding |
| `backend/middleware/auth.js` | JWT verify; populates `req.user` |
| `backend/knexfile.js` | DB connection profiles (dev/test/prod) |
| `backend/routes/payments.js` | Stripe + PayPal payment intent creation |
| `frontend/src/api.js` | Centralized fetch + auth header injection |
| `frontend/src/context/CartContext.jsx` | Cart state + localStorage persistence |
| `SETUP_GUIDE.md` | Detailed payment provider + Google account config |

## Conventions

- Backend uses CommonJS (`require`/`module.exports`). Frontend is ESM.
- Knex migrations are timestamped. Always create a new migration file rather than editing existing ones.
- Payment routes assume **test mode keys** in `.env` — production keys would require additional webhook secret validation.
- Frontend API base URL is hardcoded to `/api` and relies on Vite's proxy in dev. For production, configure your reverse proxy or change the base in `src/api.js`.
- Test files use `*.test.js` (backend) and `*.test.jsx` (frontend). Both use Jest-style `describe`/`it`.

## CI

Two GitHub Actions workflows in `.github/workflows/`:

- **`ci.yml`** — runs on push to `main`/`master` + manual dispatch. Installs backend + frontend deps, runs both test suites, builds the frontend.
- **`pr-check.yml`** — same checks, gated to PRs targeting `main`/`master`.

Both use Node 20.

## Going Further

`SETUP_GUIDE.md` (706 lines) covers:
- Stripe / PayPal / Google Sign-In / Google Pay / Apple Pay setup (§ 3–7)
- Switching the DB to Postgres or MySQL (§ 11)
- API reference (§ 13)
- Production deployment (§ 10)
- Troubleshooting (§ 14)
