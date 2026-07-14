# Gym Manager

A multi-tenant management app for small fitness businesses (independent gyms, CrossFit boxes, yoga/martial-arts studios, personal trainers). One codebase serves many gyms; each gym ("tenant") is configured with data — branding, currency, feature toggles — not code changes. Positioned as an affordable, ownable alternative to Mindbody/Glofox for small, single-location businesses.

## Quick start (Windows — one click)

1. **First time only:** open `backend\.env` and set `DATABASE_URL` to your Neon/Supabase
   connection string (double-clicking `start.bat` will create the file and open it for you).
2. **Double-click `start.bat`.** On the first run it installs packages and sets up the
   database automatically; every run frees the ports, starts both servers, and opens
   the app in your browser at http://localhost:5173.
3. Log in with `demo` / `admin@demo.test` / `password123`.

Helper scripts in the project root:

| File | What it does |
|------|--------------|
| `start.bat` | One-click launch: installs (first run), starts backend + frontend, opens the browser |
| `load-demo-data.bat` | Fills the demo gym with realistic sample data (members, sessions, bookings, payments) |
| `create-desktop-shortcut.bat` | Puts a "Gym Manager" shortcut on your Desktop that runs `start.bat` |

Keep the two server windows open while using the app; close them to stop.

## Deploy it online (to share for feedback)

This is a full-stack app: the **frontend** (React) and the **backend** (Express)
are hosted separately. Both connect to your existing **Neon** database, so your
data (including demo data) shows up online immediately.

**1. Push to GitHub** (see the next section).

**2. Backend → Render** (free): New + → **Blueprint** → pick this repo. Render
   reads `render.yaml`. Fill in the env vars it asks for:
   - `DATABASE_URL` — your Neon connection string (same one as local)
   - `CORS_ORIGIN` — your Netlify URL (set after step 3, e.g. `https://your-gym.netlify.app`)
   Deploy → copy the service URL, e.g. `https://gym-manager-api.onrender.com`.

**3. Frontend → Netlify** (free): Add new site → **Import from GitHub** → pick
   this repo. Netlify reads `netlify.toml` (base `frontend`, builds `dist`). Add
   one environment variable:
   - `VITE_API_BASE_URL` = your Render URL from step 2
   Deploy → you get a public link like `https://your-gym.netlify.app` to share.

**4.** Put that Netlify URL into Render's `CORS_ORIGIN` and redeploy the backend
   so the browser is allowed to call the API.

> Note: Render's free tier sleeps after inactivity, so the first request after a
> pause can take ~30s to wake up. Fine for feedback demos.

## Push to GitHub

```bash
cd gym-manager
git add -A && git commit -m "Ready to deploy"
# create an EMPTY repo on github.com (no README), then:
git remote add origin https://github.com/<your-username>/gym-manager.git
git branch -M main
git push -u origin main
```

On first push, Git opens a browser window to sign in to GitHub (Git Credential
Manager) — no password is typed into the terminal. Your real `.env` is
git-ignored, so no secrets are uploaded.

## Tech stack

- **Frontend:** React (Vite) + React Router + axios
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (use a free tier like Supabase or Neon)
- **Payments:** Stripe (card); GoCardless (UK direct debit) can be added later
- **Hosting target:** backend on Railway/Render, frontend on Vercel

## Folder structure

```
gym-manager/
├── backend/                 # Express API
│   ├── src/
│   │   ├── config/          # reads env vars once (config/index.js)
│   │   ├── db/              # pool, schema.sql, setup.js, seed.js
│   │   ├── middleware/      # auth (JWT + roles), error handling
│   │   ├── routes/          # one router per resource
│   │   ├── services/        # stripe wrapper
│   │   └── server.js        # app entry — wires routes together
│   └── .env.example
├── frontend/                # React app (Vite)
│   ├── src/
│   │   ├── api/             # axios client (attaches JWT)
│   │   ├── components/      # Layout (nav respects role + feature flags)
│   │   ├── config/          # branding defaults + money formatting
│   │   ├── context/         # AuthContext (user, tenant, branding)
│   │   ├── pages/           # Dashboard, Members, Schedule, Booking, CheckIn, Billing, Login
│   │   └── App.jsx          # routes + auth gate
│   └── .env.example
├── shared/
│   └── clients/default.json # reference template of what's configurable per client
└── README.md
```

## Data model (generic on purpose)

`tenants` → `users` (admin/staff/member), `members`, `membership_plans`, `session_types`, `sessions`, `bookings`, `payments`. All business tables carry `tenant_id`, and every query is scoped by it so one gym never sees another's data. Concepts are generic (`session_type`, `session`, `membership_plan`) so the same schema fits any gym style.

## Run it locally

Prerequisites: Node.js 18+, and a PostgreSQL database URL (local, or free Supabase/Neon).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # then edit .env: set DATABASE_URL and JWT_SECRET
npm run db:setup              # create tables from schema.sql
npm run db:seed               # create the "demo" tenant + admin login
npm run dev                   # API on http://localhost:4000
```

Seed login → gym code `demo`, email `admin@demo.test`, password `password123`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # leave VITE_API_BASE_URL empty for local (Vite proxies /api)
npm run dev                   # app on http://localhost:5173
```

Open http://localhost:5173 and sign in with the demo credentials above.

## Add a new client / tenant

Because this is multi-tenant, a new client is a new **row**, not a new deployment:

1. Insert a tenant and its first admin user (mirror `backend/src/db/seed.js`), choosing a unique `slug` (the "gym code" used at login).
2. Log in as that admin and set branding (name, colors, logo), currency, and feature toggles on the Settings screen — or `PUT /api/tenant`.
3. Feature flags live in `tenants.feature_flags` (JSON), e.g. `retail_pos`, `mobile_app`, `multi_location`. The UI shows/hides features based on these, so re-skinning is configuration only.

`shared/clients/default.json` documents everything that's configurable per client.

## Design principles

- Single monolithic app — no microservices, minimal abstraction.
- Money stored as integer cents.
- Popular, well-documented libraries only, so it stays maintainable.
- Configuration lives in the `tenants` table + `config/`, never scattered/hardcoded.

## Stripe setup (recurring billing)

Recurring billing is optional — without a Stripe key, subscriptions/charges are
recorded locally as succeeded so the app is fully usable for demos.

To enable real payments:

1. Put your `STRIPE_SECRET_KEY` in `backend/.env`.
2. For recurring invoices, run the Stripe CLI in dev and set the printed signing
   secret as `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```
3. Creating a recurring plan then creates a matching Stripe Price automatically;
   subscribing a member creates a Stripe customer + subscription.

The one remaining piece for live cards is confirming the first payment with
Stripe Elements on the frontend (the API already returns the `clientSecret`).

## What's built

- Members (CRUD, inline status/plan assignment), membership plans
- Scheduling (create/cancel sessions from type templates)
- Online booking + cancel, with per-member QR codes
- Check-in: session roster, camera QR scan, or manual booking code
- Billing: one-off charges + plan subscriptions (Stripe-backed, webhook-recorded)
- Reporting dashboard (active/churned members, revenue, attendance)
- Admin Settings: gym name, currency, brand colors, feature toggles

## Roadmap

- Stripe Elements card confirmation for the first subscription payment
- Email notifications (booking confirmations, failed payments)
- GoCardless for UK direct debit
