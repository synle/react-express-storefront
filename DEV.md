# react-express-storefront

E-commerce storefront with a React + Vite frontend and an Express + Knex/SQLite backend. Supports Stripe, PayPal, and Google Auth checkout flows.

## Quick Start

Install dependencies for both apps:

```bash
cd backend && npm ci || npm install --no-fund --prefer-offline
cd ../frontend && npm ci || npm install --no-fund --prefer-offline
```

Initialize the backend database (migrations + seed):

```bash
cd backend
npm run migrate
npm run seed
```

Run the backend dev server (auto-reloads on changes):

```bash
cd backend
npm run dev
```

Run the frontend dev server in a separate shell:

```bash
cd frontend
npm run dev
```

Run tests:

```bash
cd backend && npm test
cd ../frontend && npm test
```
