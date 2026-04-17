-- ============================================================
-- RIXX — Nuevas Tablas (v2)
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
--
-- Requiere que ya existan:
--   products   (id UUID PK)
--   change_log (id BIGSERIAL, product_id UUID → products)
--
-- Tablas incluidas:
--   orders · wishlist · reviews · newsletter_subscribers · coupons
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 0. LIMPIAR TABLAS ANTERIORES (si existían)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS wishlist             CASCADE;
DROP TABLE IF EXISTS reviews              CASCADE;
DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS coupons              CASCADE;
DROP TABLE IF EXISTS orders               CASCADE;


-- ────────────────────────────────────────────────────────────
-- 1. FUNCIÓN update_updated_at  (reutilizable, idempotente)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 2. TABLA: orders
--    Pedidos de clientes con soporte MercadoPago
-- ────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos del comprador
  user_email       TEXT,
  user_name        TEXT,
  user_phone       TEXT,

  -- Dirección de envío: { calle, ciudad, departamento, cp }
  shipping_address JSONB,

  -- Líneas del pedido: [{ product_id, name, qty, price }]
  items            JSONB,

  -- Totales
  subtotal         NUMERIC(10,2),
  discount         NUMERIC(10,2) DEFAULT 0,
  total            NUMERIC(10,2),
  coupon_code      TEXT,

  -- Estado del pedido
  status           TEXT          DEFAULT 'pendiente'
                   CHECK (status IN ('pendiente','confirmado','enviado','entregado','cancelado')),

  -- Pago
  payment_method   TEXT,
  payment_id       TEXT,                     -- ID de transacción MercadoPago

  -- Notas internas
  notes            TEXT,

  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- Trigger updated_at para orders
DROP TRIGGER IF EXISTS set_updated_at_orders ON orders;
CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders (user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);


-- ────────────────────────────────────────────────────────────
-- 3. TABLA: wishlist
--    Lista de deseos por usuario (un registro por producto)
-- ────────────────────────────────────────────────────────────
CREATE TABLE wishlist (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT        NOT NULL,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_wishlist_user_product UNIQUE (user_email, product_id)
);

-- RLS
ALTER TABLE wishlist DISABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_wishlist_user_email ON wishlist (user_email);


-- ────────────────────────────────────────────────────────────
-- 4. TABLA: reviews
--    Reseñas de productos (1–5 estrellas)
-- ────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_email        TEXT        NOT NULL,
  user_name         TEXT        NOT NULL,
  rating            INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment           TEXT,
  verified_purchase BOOLEAN     DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

-- Índices
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);


-- ────────────────────────────────────────────────────────────
-- 5. TABLA: newsletter_subscribers
--    Suscriptores al boletín de Rixx
-- ────────────────────────────────────────────────────────────
CREATE TABLE newsletter_subscribers (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        UNIQUE NOT NULL,
  name       TEXT,
  active     BOOLEAN     DEFAULT true,
  source     TEXT        DEFAULT 'website',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE newsletter_subscribers DISABLE ROW LEVEL SECURITY;

-- Índices (UNIQUE ya crea un índice; este es explícito para búsquedas parciales)
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers (email);


-- ────────────────────────────────────────────────────────────
-- 6. TABLA: coupons
--    Cupones de descuento (porcentaje o monto fijo)
-- ────────────────────────────────────────────────────────────
CREATE TABLE coupons (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT          UNIQUE NOT NULL,
  type          TEXT          DEFAULT 'percentage'
                CHECK (type IN ('percentage', 'fixed')),
  value         NUMERIC(10,2) NOT NULL,
  min_purchase  NUMERIC(10,2) DEFAULT 0,
  max_uses      INTEGER,                       -- NULL = usos ilimitados
  used_count    INTEGER       DEFAULT 0,
  valid_from    TIMESTAMPTZ   DEFAULT NOW(),
  valid_until   TIMESTAMPTZ,                   -- NULL = sin vencimiento
  active        BOOLEAN       DEFAULT true,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- RLS
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────
-- 7. SEED: cupones de ejemplo
-- ────────────────────────────────────────────────────────────
INSERT INTO coupons (code, type, value, min_purchase, max_uses, valid_until, active)
VALUES
  -- 10 % de descuento, sin mínimo, 100 usos, válido 1 año
  (
    'RIXX10',
    'percentage',
    10.00,
    0.00,
    100,
    NOW() + INTERVAL '1 year',
    true
  ),
  -- 20 % de descuento, sin mínimo, 50 usos, válido 1 año
  (
    'RIXX20',
    'percentage',
    20.00,
    0.00,
    50,
    NOW() + INTERVAL '1 year',
    true
  ),
  -- 15 % de descuento, mínimo $100, 200 usos, válido 6 meses
  (
    'BIENVENIDO',
    'percentage',
    15.00,
    100.00,
    200,
    NOW() + INTERVAL '6 months',
    true
  );


-- ────────────────────────────────────────────────────────────
-- FIN DEL SCRIPT
-- ============================================================
