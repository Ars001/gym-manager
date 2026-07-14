-- Gym Manager schema (multi-tenant).
-- WHY: every business row carries a tenant_id so one deployment can serve many
-- gyms with fully isolated data. Concepts are generic (session_type, session,
-- membership_plan) so the same tables fit a CrossFit box, yoga studio, or PT.

-- Enable UUIDs (pgcrypto ships with Supabase/Neon and modern Postgres).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tenants: one row per gym/client. Holds branding + feature toggles so a new
-- client is configured with data, not code changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,              -- used to resolve tenant at login
  name          TEXT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  secondary_color TEXT NOT NULL DEFAULT '#1e293b',
  logo_url      TEXT,
  -- Feature toggles (retail/POS, mobile app, multi-location, etc.) as JSON so
  -- new flags don't require a migration.
  feature_flags JSONB NOT NULL DEFAULT '{"retail_pos": false, "mobile_app": false, "multi_location": false}',
  stripe_account_id TEXT,                          -- reserved for future Stripe Connect
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()  -- also the free-trial start (trial = created_at + 14 days)
);

-- ---------------------------------------------------------------------------
-- Users: anyone who logs in. Role decides what they can do. A member-role user
-- links to a members row via member_id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'member')),
  member_id     UUID,                              -- set for member-role logins
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)                        -- email unique per gym, not globally
);

-- ---------------------------------------------------------------------------
-- Membership plans: what a member pays for (recurring or one-off).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  price_cents    INTEGER NOT NULL DEFAULT 0,       -- store money as integer cents
  currency       TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('week', 'month', 'year', 'one_off')),
  stripe_price_id TEXT,
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Members: the gym's customers. status drives active vs churned reporting.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT,
  phone              TEXT,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'inactive', 'cancelled')),
  membership_plan_id UUID REFERENCES membership_plans(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  notes              TEXT,
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Session types: reusable templates ("CrossFit WOD", "Yoga Flow", "PT 1:1").
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  color             TEXT DEFAULT '#2563eb',
  default_capacity  INTEGER NOT NULL DEFAULT 10,
  default_duration_min INTEGER NOT NULL DEFAULT 60,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Sessions: a scheduled instance of a session type on the calendar.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_type_id UUID REFERENCES session_types(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  instructor      TEXT,
  location        TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  capacity        INTEGER NOT NULL DEFAULT 10,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_start ON sessions (tenant_id, starts_at);

-- ---------------------------------------------------------------------------
-- Bookings: a member's spot in a session. Also carries check-in state so we
-- don't need a separate check-in table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled', 'attended', 'no_show')),
  booked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ
);
-- A member can only hold one active booking per session.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking
  ON bookings (session_id, member_id)
  WHERE status IN ('booked', 'attended');

-- ---------------------------------------------------------------------------
-- Payments: every charge, recurring or one-off. Reporting reads from here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id                UUID REFERENCES members(id) ON DELETE SET NULL,
  amount_cents             INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'USD',
  type                     TEXT NOT NULL DEFAULT 'one_off' CHECK (type IN ('subscription', 'one_off')),
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  description              TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id   TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_created ON payments (tenant_id, created_at);
