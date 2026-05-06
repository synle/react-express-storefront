# ShopSimple — Complete Setup Guide

A full-stack e-commerce application with **Stripe**, **PayPal**, **Google Pay**, **Apple Pay** payment processing and **Google Sign-In** authentication.

**Tech Stack:** Node.js + Express (backend), React + Vite (frontend), SQLite via Knex.js (database)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Setup](#2-project-setup)
3. [Stripe Setup](#3-stripe-setup)
4. [PayPal Setup](#4-paypal-setup)
5. [Google Sign-In Setup](#5-google-sign-in-setup)
6. [Google Pay Setup](#6-google-pay-setup-via-stripe)
7. [Apple Pay Setup](#7-apple-pay-setup-via-stripe)
8. [Running the Application](#8-running-the-application)
9. [Test Cards & Accounts](#9-test-cards--accounts)
10. [Going to Production](#10-going-to-production)
11. [Switching Databases](#11-switching-databases-sqlite--postgresql--mysql)
12. [Project Structure](#12-project-structure)
13. [API Reference](#13-api-reference)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Prerequisites

Install these before starting:

| Tool | Version | How to Install |
|------|---------|---------------|
| **Node.js** | 18 or higher | https://nodejs.org — download the LTS version |
| **npm** | 9 or higher | Comes with Node.js |
| **Git** | Any | https://git-scm.com |

Verify your installation:

```bash
node --version   # Should print v18.x.x or higher
npm --version    # Should print 9.x.x or higher
```

You'll also need accounts on:
- **Stripe** (for card, Google Pay, Apple Pay)
- **PayPal** (for PayPal payments)
- **Google Cloud** (for Google Sign-In)

All three offer **free developer/test accounts**. We'll walk through each below.

---

## 2. Project Setup

### 2.1 Install Dependencies

```bash
# From the project root
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2.2 Create Environment File

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` in your editor. You'll fill in the values as you complete each section below.

### 2.3 Generate a JWT Secret

Your JWT secret can be any random string. Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into your `.env`:
```
JWT_SECRET=<paste-the-long-random-string-here>
```

---

## 3. Stripe Setup

Stripe handles **credit/debit card** payments and also enables **Google Pay** and **Apple Pay**.

### 3.1 Create a Stripe Account (Free)

1. Go to **https://dashboard.stripe.com/register**
2. Enter your email, full name, and create a password
3. Click **"Create account"**
4. Verify your email by clicking the link Stripe sends you
5. You're now in the **Stripe Dashboard**

> You do NOT need to activate your account or provide business details for testing. The test mode works immediately.

### 3.2 Get Your Test API Keys

1. In the Stripe Dashboard, make sure **"Test mode"** is toggled ON (top-right area — you'll see an orange "Test mode" badge)
2. Click **"Developers"** in the left sidebar
3. Click **"API keys"**
4. You'll see two keys:
   - **Publishable key** — starts with `pk_test_...`
   - **Secret key** — starts with `sk_test_...` (click "Reveal test key" to see it)

5. Copy both keys into your `.env`:

```
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
```

### 3.3 Set Up Stripe Webhook (Optional for Dev, Required for Production)

Webhooks let Stripe notify your server about payment events asynchronously. For basic testing, the app works without webhooks (it verifies payments directly). For production, you should set up webhooks.

#### For Local Development (using Stripe CLI):

1. Install the Stripe CLI:
   - **macOS:** `brew install stripe/stripe-cli/stripe`
   - **Windows:** Download from https://github.com/stripe/stripe-cli/releases
   - **Linux:** `curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg && echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list && sudo apt update && sudo apt install stripe`

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```
   This opens your browser. Click "Allow access."

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3001/api/payments/stripe/webhook
   ```

4. The CLI prints a **webhook signing secret** (starts with `whsec_...`). Copy it into `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx
   ```

#### For Production:

1. In Stripe Dashboard → Developers → Webhooks → **"Add endpoint"**
2. Enter your production URL: `https://yourdomain.com/api/payments/stripe/webhook`
3. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Click **"Add endpoint"**
5. Click **"Reveal"** under Signing secret and copy it to your production `.env`

---

## 4. PayPal Setup

### 4.1 Create a PayPal Developer Account (Free)

1. Go to **https://developer.paypal.com**
2. Click **"Log in to Dashboard"**
3. If you have a personal PayPal account, log in with it. If not, click **"Sign Up"** and create one (free)
4. You're now in the PayPal Developer Dashboard

### 4.2 Create a Sandbox App

1. In the Developer Dashboard, click **"Apps & Credentials"** in the top menu
2. Make sure **"Sandbox"** tab is selected (not "Live")
3. Click **"Create App"**
4. Enter an app name (e.g., "ShopSimple Dev")
5. Select **"Merchant"** as the account type
6. Click **"Create App"**

You'll see your app's credentials:
- **Client ID** — a long alphanumeric string
- **Secret** — click "Show" to reveal it

Copy both into your `.env`:

```
PAYPAL_CLIENT_ID=your-client-id-here
PAYPAL_CLIENT_SECRET=your-secret-here
PAYPAL_MODE=sandbox
```

### 4.3 Sandbox Test Accounts

PayPal automatically creates sandbox test accounts for you:

1. In Developer Dashboard, go to **"Sandbox"** → **"Accounts"**
2. You'll see two accounts:
   - **Business** — simulates the merchant (your store)
   - **Personal** — simulates the buyer (your customer)
3. Click the **three dots (...)** next to the Personal account → **"View/edit account"**
4. Note the **email** and **password** (or set a new password)

When testing PayPal payments, use these sandbox credentials to log into the PayPal popup.

### 4.4 PayPal for Production

When you're ready to go live:

1. In the Developer Dashboard, switch to the **"Live"** tab
2. Create a new app (or use the same one) — you'll need to have a verified PayPal Business account
3. Get your **Live Client ID** and **Secret**
4. Update your `.env`:
   ```
   PAYPAL_CLIENT_ID=your-live-client-id
   PAYPAL_CLIENT_SECRET=your-live-secret
   PAYPAL_MODE=live
   ```

---

## 5. Google Sign-In Setup

### 5.1 Create a Google Cloud Project

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. Click the project dropdown (top of the page, next to "Google Cloud")
4. Click **"New Project"**
5. Enter a project name (e.g., "ShopSimple")
6. Click **"Create"**
7. Make sure the new project is selected in the dropdown

### 5.2 Enable the Google Identity API

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
   (Or search "API Library" in the top search bar)
2. Search for **"Google Identity Services"** or **"People API"**
3. Click **"People API"**
4. Click **"Enable"**

### 5.3 Configure the OAuth Consent Screen

Before creating credentials, you must configure what users see when they sign in:

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you're using Google Workspace and want internal-only)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name:** ShopSimple (or your app name)
   - **User support email:** your email
   - **Developer contact email:** your email
5. Click **"Save and Continue"**
6. **Scopes** page: Click **"Add or remove scopes"**
   - Select: `email`, `profile`, `openid`
   - Click **"Update"** then **"Save and Continue"**
7. **Test users** page: Click **"Add Users"** and add your Google email
   - This is required while the app is in "Testing" status
   - Click **"Save and Continue"**
8. Click **"Back to Dashboard"**

> **Important:** While in "Testing" status, only the test users you added can sign in. To allow anyone to sign in, you'll need to **"Publish"** the app (see Production section below).

### 5.4 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. For **Application type**, select **"Web application"**
4. **Name:** ShopSimple Web Client
5. **Authorized JavaScript origins:** Add:
   - `http://localhost:5173` (for development)
   - `http://localhost:3001` (for development)
6. **Authorized redirect URIs:** Add:
   - `http://localhost:5173` (for development)
7. Click **"Create"**

You'll see a popup with your **Client ID** and **Client Secret**. You only need the **Client ID** (it ends with `.apps.googleusercontent.com`).

Copy the Client ID into your `.env`:

```
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
```

### 5.5 Google Sign-In for Production

When deploying to production:

1. Go back to **"APIs & Services"** → **"Credentials"**
2. Edit your OAuth client ID
3. Add your production domain to:
   - **Authorized JavaScript origins:** `https://yourdomain.com`
   - **Authorized redirect URIs:** `https://yourdomain.com`
4. Go to **"OAuth consent screen"** → Click **"Publish App"**
   - This allows any Google user to sign in
   - Google may review your app if you request sensitive scopes

---

## 6. Google Pay Setup (via Stripe)

Google Pay is handled **automatically** by Stripe's Payment Element. When Stripe's Payment Element renders on the checkout page, it detects if the user has Google Pay set up and shows it as an option.

### Requirements

1. Your Stripe test keys are configured (Section 3 above)
2. That's it for testing! Stripe handles everything.

### How It Works

- Stripe's `PaymentElement` component automatically detects if the user's browser/device supports Google Pay
- On Chrome with a saved Google Pay card, users will see a "Google Pay" button
- The payment flows through Stripe — you don't need a separate Google Pay merchant account for this

### Testing Google Pay

1. Open Chrome browser
2. Make sure you have a card saved in Google Pay (go to https://pay.google.com)
3. Navigate to the checkout page
4. The Google Pay option should appear in the Stripe Payment Element

> **Note:** Google Pay may not show up in development on `localhost` with some browsers. It works reliably in production with HTTPS.

### Production

In your Stripe Dashboard:
1. Go to **Settings** → **Payment methods**
2. Ensure **"Google Pay"** is turned ON (it usually is by default)

---

## 7. Apple Pay Setup (via Stripe)

Apple Pay is also handled through Stripe's Payment Element, but it requires **domain verification** for production.

### For Development/Testing

Apple Pay **only works on real Apple devices** (iPhone, iPad, Mac with Safari) and requires HTTPS. It won't work on `localhost` without extra setup.

To test locally:
1. You need a Mac with Safari
2. You need an HTTPS tunnel (like ngrok): `ngrok http 5173`
3. Register the ngrok domain with Stripe (see below)

### For Production

1. **Register your domain with Stripe:**
   - Go to Stripe Dashboard → **Settings** → **Payment methods** → **Apple Pay**
   - Click **"Add new domain"**
   - Enter your domain (e.g., `shop.yourdomain.com`)
   - Stripe provides a verification file
   - Download the file and host it at: `https://yourdomain.com/.well-known/apple-developer-merchantid-domain-association`
   - Click **"Verify"**

2. **Enable Apple Pay** in Stripe Dashboard → Settings → Payment methods

3. **Ensure your domain uses HTTPS** — Apple Pay only works on HTTPS

### How It Works

- On Safari (macOS/iOS), Stripe's Payment Element will automatically show Apple Pay if the user has it configured
- The user authenticates with Face ID, Touch ID, or their Apple device passcode
- Payment flows through Stripe — you get a standard Stripe PaymentIntent confirmation

---

## 8. Running the Application

### 8.1 Start the Backend

```bash
cd backend
cp .env.example .env    # If you haven't already
# Edit .env with your API keys (see sections above)
npm start
```

The backend will:
- Run database migrations automatically
- Seed the database with 12 sample products
- Start listening on http://localhost:3001

You should see:
```
Database migrations complete
Database seeded with sample products
Server running at http://localhost:3001
Environment: development
```

### 8.2 Start the Frontend (in a separate terminal)

```bash
cd frontend
npm run dev
```

Vite starts the dev server on http://localhost:5173.

### 8.3 Use the App

1. Open **http://localhost:5173** in your browser
2. Browse products, use search and category filters
3. Click a product to see details, adjust quantity, add to cart
4. Go to Cart, review items
5. Click "Proceed to Checkout"
6. Choose payment method (Card via Stripe, or PayPal)
7. Complete payment using test credentials (see Section 9)
8. See order confirmation

---

## 9. Test Cards & Accounts

### Stripe Test Cards

Use these card numbers in the Stripe payment form. Use **any future expiration date** and **any 3-digit CVC**.

| Card Number | Scenario |
|------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Payment is declined |
| `4000 0000 0000 0077` | Charge succeeds but refund fails |
| `5555 5555 5555 4444` | Mastercard — successful |
| `3782 822463 10005` | American Express — successful |

For the **ZIP code**, enter any 5-digit number (e.g., `12345`).

Full list: https://docs.stripe.com/testing#cards

### PayPal Sandbox Accounts

Use the sandbox Personal account credentials (from Section 4.3):

1. On the checkout page, click the PayPal button
2. In the PayPal popup, log in with your sandbox Personal account email/password
3. Click "Pay Now"
4. The popup closes and the payment completes

If you forgot your sandbox credentials:
1. Go to https://developer.paypal.com/dashboard/accounts
2. Click the "..." next to the Personal account → "View/edit account"
3. Note or reset the email and password

### Google Sign-In Testing

Use any Google account that you added as a test user (Section 5.3, step 7).

---

## 10. Going to Production

### 10.1 Pre-Launch Checklist

- [ ] Switch Stripe to live mode and use live API keys (`sk_live_...`, `pk_live_...`)
- [ ] Switch PayPal to live mode and use live credentials
- [ ] Publish your Google OAuth consent screen
- [ ] Add production domains to Google OAuth credentials
- [ ] Register domain for Apple Pay with Stripe
- [ ] Set up Stripe webhook pointing to your production server
- [ ] Use a strong, unique `JWT_SECRET`
- [ ] Switch from SQLite to PostgreSQL (see Section 11)
- [ ] Use HTTPS everywhere
- [ ] Set `NODE_ENV=production`
- [ ] Enable rate limiting on API endpoints
- [ ] Set up proper error logging (e.g., Sentry)
- [ ] Enable CORS only for your production domain

### 10.2 Stripe Production

1. In Stripe Dashboard, toggle OFF "Test mode"
2. Complete your account activation (provide business details, bank account)
3. Get your live keys: `pk_live_...` and `sk_live_...`
4. Update `.env`:
   ```
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
   STRIPE_SECRET_KEY=sk_live_xxxx
   ```

### 10.3 PayPal Production

1. In PayPal Developer Dashboard, switch to "Live" tab
2. Create or use an existing live app
3. Update `.env`:
   ```
   PAYPAL_CLIENT_ID=<live-client-id>
   PAYPAL_CLIENT_SECRET=<live-secret>
   PAYPAL_MODE=live
   ```

### 10.4 Google Sign-In Production

1. Add production domain to OAuth credentials (Authorized JavaScript origins + redirect URIs)
2. Publish the OAuth consent screen
3. The same `GOOGLE_CLIENT_ID` works for both dev and prod (just add the domains)

---

## 11. Switching Databases (SQLite → PostgreSQL / MySQL)

The app uses **Knex.js** as a query builder, so switching databases requires **zero code changes** — just configuration.

### Switch to PostgreSQL

1. Install the PostgreSQL driver:
   ```bash
   cd backend
   npm install pg
   ```

2. Create a PostgreSQL database:
   ```bash
   createdb shop    # or use pgAdmin / your preferred tool
   ```

3. Update `.env`:
   ```
   NODE_ENV=postgres
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=shop
   DB_USER=postgres
   DB_PASSWORD=your-password
   ```

4. Restart the server. Knex will run migrations on the new database automatically.

### Switch to MySQL

1. Install the MySQL driver:
   ```bash
   cd backend
   npm install mysql2
   ```

2. Create a MySQL database:
   ```sql
   CREATE DATABASE shop;
   ```

3. Update `.env`:
   ```
   NODE_ENV=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=shop
   DB_USER=root
   DB_PASSWORD=your-password
   ```

4. Restart the server.

### Why Knex.js?

Knex.js is a SQL query builder that abstracts database dialect differences:
- You write queries once using Knex's JavaScript API
- Knex translates them to the correct SQL for your database
- Migrations work identically across databases
- The `knexfile.js` file contains configuration for all database options

---

## 12. Project Structure

```
react-express-storefront/
├── SETUP_GUIDE.md                  ← You are here
│
├── backend/
│   ├── package.json                ← Backend dependencies
│   ├── .env.example                ← Environment variables template
│   ├── .env                        ← Your local config (git-ignored)
│   ├── server.js                   ← Express server entry point
│   ├── knexfile.js                 ← Database configuration
│   ├── middleware/
│   │   └── auth.js                 ← JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js                 ← Google Sign-In verification
│   │   ├── products.js             ← Product listing & search
│   │   ├── cart.js                 ← Server-side cart management
│   │   ├── payments.js             ← Stripe & PayPal payment processing
│   │   └── payments-webhook.js     ← Stripe webhook handler
│   └── db/
│       ├── migrations/
│       │   └── 20240101_initial.js ← Database schema
│       └── seeds/
│           └── 01_products.js      ← Sample product data
│
├── frontend/
│   ├── package.json                ← Frontend dependencies
│   ├── index.html                  ← HTML entry point (loads Google SDK)
│   ├── vite.config.js              ← Vite config with API proxy
│   └── src/
│       ├── main.jsx                ← React entry point
│       ├── App.jsx                 ← Router setup
│       ├── App.css                 ← All styles
│       ├── api.js                  ← Backend API client
│       ├── context/
│       │   ├── AuthContext.jsx      ← Authentication state
│       │   └── CartContext.jsx      ← Shopping cart state
│       ├── components/
│       │   ├── Navbar.jsx           ← Top navigation bar
│       │   ├── ProductCard.jsx      ← Product grid card
│       │   └── CartItem.jsx         ← Cart line item
│       └── pages/
│           ├── Home.jsx             ← Product listing with search
│           ├── ProductDetail.jsx    ← Single product view
│           ├── Cart.jsx             ← Shopping cart
│           ├── Checkout.jsx         ← Payment (Stripe + PayPal)
│           ├── Login.jsx            ← Google Sign-In
│           └── OrderConfirmation.jsx ← Post-payment confirmation
```

---

## 13. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/google` | No | Exchange Google ID token for JWT |
| GET | `/api/auth/me` | Yes | Get current user profile |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/products` | No | List products (supports `?search=`, `?category=`, `?page=`, `?limit=`) |
| GET | `/api/products/categories` | No | List all categories |
| GET | `/api/products/:id` | No | Get single product |

### Cart (Server-side)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cart` | Yes | Get user's cart |
| POST | `/api/cart` | Yes | Add item (`{ productId, quantity }`) |
| PUT | `/api/cart/:id` | Yes | Update quantity (`{ quantity }`) |
| DELETE | `/api/cart/:id` | Yes | Remove item |
| DELETE | `/api/cart` | Yes | Clear cart |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments/config` | No | Get publishable keys for frontend |
| POST | `/api/payments/stripe/create-payment-intent` | Optional | Create Stripe PaymentIntent |
| POST | `/api/payments/stripe/confirm-order` | Optional | Verify payment & create order |
| POST | `/api/payments/paypal/create-order` | Optional | Create PayPal order |
| POST | `/api/payments/paypal/capture-order` | Optional | Capture PayPal payment & create order |
| GET | `/api/payments/orders/:id` | Optional | Get order details |

---

## 14. Troubleshooting

### "STRIPE_SECRET_KEY is not set" or Stripe errors

- Make sure you copied `.env.example` to `.env` and filled in your Stripe keys
- Make sure the keys start with `sk_test_` (secret) and `pk_test_` (publishable)
- Restart the backend after changing `.env`

### PayPal popup closes immediately

- Check browser console for errors
- Verify your PayPal sandbox Client ID is correct
- Make sure `PAYPAL_MODE=sandbox` in `.env`

### Google Sign-In button doesn't appear

- Open browser console and check for errors
- Verify `GOOGLE_CLIENT_ID` is set in `.env`
- Make sure `http://localhost:5173` is in your Google OAuth Authorized JavaScript Origins
- Make sure your Google account is added as a test user (while app is in Testing status)

### "Invalid Google credential" after clicking Sign In

- Your `GOOGLE_CLIENT_ID` in `.env` might not match the one in Google Cloud Console
- The OAuth consent screen might not have the required scopes (email, profile, openid)

### Google Pay not showing up

- Google Pay only appears if your browser/device has Google Pay configured
- In test mode, it may not appear on localhost — this is normal
- Try with Chrome and a Google account that has a payment method saved

### Apple Pay not showing up

- Apple Pay only works on Apple devices with Safari
- Requires HTTPS (won't work on http://localhost)
- For local testing, use an HTTPS tunnel like ngrok

### Database issues

- Delete `backend/db/shop.sqlite3` and restart the server to reset the database
- Check migration errors in the terminal output

### "Cannot find module" errors

- Run `npm install` in both `backend/` and `frontend/` directories
- Delete `node_modules` and reinstall if needed

### Port already in use

- Change `PORT=3001` in `.env` to another port
- Or find and kill the process using the port:
  ```bash
  lsof -i :3001  # Find the process
  kill -9 <PID>  # Kill it
  ```
