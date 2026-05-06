# React Express Storefront

A small full-stack e-commerce application — **Node.js + Express** backend, **React + Vite** frontend, **SQLite via Knex** database. Implements products, cart, auth (Google Sign-In), checkout, and a payments layer wired up for Stripe / PayPal / Google Pay / Apple Pay.

The user-facing product is internally named **ShopSimple** (see `SETUP_GUIDE.md`).

## Layout

```
backend/    Express + Knex + Jest      (REST API on :4000)
frontend/   React + Vite               (UI on :5173)
SETUP_GUIDE.md   Detailed setup, including payment provider config
```

## Quick start

```bash
# Backend
cd backend
cp .env.example .env       # fill in Stripe / PayPal / Google keys
npm install
npm run migrate            # creates db.sqlite via Knex
npm run seed               # loads demo products
npm start                  # http://localhost:4000

# Frontend
cd frontend
cp .env.example .env       # paste the same Stripe publishable key + Google client ID
npm install
npm run dev                # http://localhost:5173
```

Default test login uses Google Sign-In; payment flows accept Stripe test cards (`4242 4242 4242 4242`) and PayPal sandbox accounts. See `SETUP_GUIDE.md` § 9 for the full test card list.

## Tests

```bash
cd backend && npm test                     # Jest: integration + unit
cd frontend && npm test                    # Vitest + React Testing Library
```

## CI

`.github/workflows/ci.yml` runs both backend and frontend test suites on push to `main`/`master` and on PRs. `pr-check.yml` runs the same on pull requests.

## Going further

`SETUP_GUIDE.md` covers:
- Stripe / PayPal / Google Sign-In / Google Pay / Apple Pay account + key setup (§ 3–7)
- Switching the DB to Postgres or MySQL (§ 11)
- API reference (§ 13)
- Production deployment notes (§ 10)
- Troubleshooting (§ 14)
