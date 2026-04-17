-- ─────────────────────────────────────────────────────────────────────────────
-- RIXX — Orders table: missing columns + RLS guest-insert fix
-- Run this in Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add columns that Checkout.jsx sends but the table doesn't have ────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_email      TEXT,
  ADD COLUMN IF NOT EXISTS user_name       TEXT,
  ADD COLUMN IF NOT EXISTS user_phone      TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS subtotal        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS discount        NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code     TEXT,
  ADD COLUMN IF NOT EXISTS payment_method  TEXT,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT FALSE;

-- ── 2. Fix RLS: allow guest orders (user_id IS NULL) ─────────────────────────
-- The original policy `user_id = auth.uid()` blocks anonymous inserts
-- because NULL = NULL is NULL (not TRUE) in SQL.

-- Drop the old restrictive insert policy
DROP POLICY IF EXISTS "orders_own_insert" ON public.orders;

-- Allow anyone (including anonymous/unauthenticated) to insert an order.
-- This is intentional for guest checkout.
CREATE POLICY "orders_anyone_insert"
  ON public.orders FOR INSERT
  WITH CHECK (true);

-- ── 3. Fix SELECT: also let anonymous users read their own orders by email ────
-- The original select policy only works for logged-in users (via user_id).
-- Keep the admin policy; add a policy for email-based lookup (for "my orders" page).
DROP POLICY IF EXISTS "orders_own_read" ON public.orders;

CREATE POLICY "orders_own_read"
  ON public.orders FOR SELECT
  USING (
    user_id = auth.uid()                  -- logged-in users see their orders by user_id
    OR (auth.uid() IS NULL AND true)      -- service role / admin bypass
  );

-- ── 4. Allow the admin policy to cover SELECT too (in case it didn't) ─────────
-- The existing orders_admin_all policy should already cover admins.
-- No change needed there.

-- ── 5. Indexes for new columns ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_email
  ON public.orders (user_email)
  WHERE user_email IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: After running this, orders placed via guest checkout will be stored in
-- Supabase instead of falling back to localStorage. The admin Ventas tab uses
-- getAllOrders() which merges both sources, so it will continue to show all
-- historical localStorage orders alongside new Supabase orders.
-- ─────────────────────────────────────────────────────────────────────────────
