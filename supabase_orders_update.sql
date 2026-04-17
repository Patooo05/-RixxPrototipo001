-- ─────────────────────────────────────────────────────────────────────────────
-- RIXX — Orders table update
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add new columns to the existing orders table
-- (safe — only adds if not already present)

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS marketing_opt_in  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_id           UUID;   -- nullable, linked after account creation

-- Make user_id nullable (in case it was NOT NULL before)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

-- ── Index for automation queries ──────────────────────────────
-- Find orders eligible for drop / re-purchase messages
CREATE INDEX IF NOT EXISTS idx_orders_marketing
  ON orders (marketing_opt_in, created_at)
  WHERE marketing_opt_in = TRUE;

-- Find orders by user_id (for linking guest orders after sign-up)
CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON orders (user_id)
  WHERE user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTOMATION: link guest orders to newly created account
-- Call this after a guest creates an account post-purchase.
-- Usage: SELECT link_guest_orders('customer@email.com', 'new-user-uuid');
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION link_guest_orders(p_email TEXT, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE orders
     SET user_id = p_user_id
   WHERE user_email = p_email
     AND user_id IS NULL;
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEDULED JOB: automation triggers (runs via pg_cron or external cron)
--
-- Example queries for the automation flows:
-- ─────────────────────────────────────────────────────────────────────────────

-- Flow 3: Drop access (orders 2–3 days old, opted in)
-- SELECT user_email, user_name, phone
-- FROM orders
-- WHERE marketing_opt_in = TRUE
--   AND created_at BETWEEN NOW() - INTERVAL '3 days' AND NOW() - INTERVAL '2 days'
--   AND status NOT IN ('cancelado');

-- Flow 4: Re-purchase (orders 5–7 days old, opted in)
-- SELECT user_email, user_name, phone
-- FROM orders
-- WHERE marketing_opt_in = TRUE
--   AND created_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '5 days'
--   AND status NOT IN ('cancelado');
