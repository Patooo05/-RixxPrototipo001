-- ============================================================
-- RIXX — Supabase Schema
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Limpiar si ya existían tablas anteriores ─────────────────
DROP TABLE IF EXISTS change_log CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- ── Tabla products ───────────────────────────────────────────
CREATE TABLE products (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  precio_costo    NUMERIC(10,2),
  image           TEXT,
  category        TEXT,
  description     TEXT          DEFAULT '',
  stock           INTEGER       DEFAULT 0,
  featured        BOOLEAN       DEFAULT false,
  is_new          BOOLEAN       DEFAULT false,
  rating          NUMERIC(3,1)  DEFAULT 0,
  status          TEXT          DEFAULT 'activo',
  characteristics JSONB         DEFAULT '[]',
  images          JSONB         DEFAULT '[]',
  variants        JSONB         DEFAULT '[]',
  descuento       JSONB,
  price_history   JSONB         DEFAULT '[]',
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ── Tabla change_log ─────────────────────────────────────────
CREATE TABLE change_log (
  id          BIGSERIAL    PRIMARY KEY,
  timestamp   TEXT,
  tipo        TEXT,
  product_id  UUID         REFERENCES products(id) ON DELETE SET NULL,
  nombre      TEXT,
  operador    TEXT         DEFAULT 'admin',
  detalle     TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ── RLS: permitir todo con anon key (prototipo) ──────────────
ALTER TABLE products  DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_log DISABLE ROW LEVEL SECURITY;

-- ── Trigger: updated_at automático ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed: productos iniciales ────────────────────────────────
INSERT INTO products (name, price, precio_costo, category, description, stock, featured, is_new, rating, status, characteristics, images, price_history)
VALUES
  ('Vintage A',         120,    54, 'Classic', 'Diseño clásico atemporal con montura fina',            3, false, false, 4, 'activo', '["Montura fina","UV400","Ligeros"]',              '[]', '[{"precio":120,"fecha":"2025-01-01"}]'),
  ('Vintage B',         150,    68, 'Classic', 'Lentes vintage de edición limitada premium',           0, true,  false, 5, 'activo', '["Edición limitada","Clásico","Premium"]',        '[]', '[{"precio":150,"fecha":"2025-01-01"}]'),
  ('Urban Shield',       99,    44, 'Sport',   'Resistentes y ligeros para el día a día urbano',       5, false, false, 4, 'activo', '["Anti-impacto","Ligeros","Resistentes"]',        '[]', '[{"precio":99,"fecha":"2025-01-01"}]'),
  ('Night Vision',      135,    61, 'Sport',   'Alto contraste para uso nocturno y deportivo',         2, true,  false, 4, 'activo', '["Alto contraste","Anti-reflejo","Sport"]',       '[]', '[{"precio":135,"fecha":"2025-01-01"}]'),
  ('Gold Frame',        175,    80, 'Luxury',  'Montura dorada con cristales de lujo premium',         4, true,  false, 5, 'activo', '["Montura dorada","Cristales premium","Lujo"]',   '[]', '[{"precio":175,"fecha":"2025-01-01"}]'),
  ('Classic Elite',     145,    65, 'Classic', 'Elegancia clásica para el estilo contemporáneo',       6, false, false, 4, 'activo', '["Elegante","Clásico","Versátil"]',               '[]', '[{"precio":145,"fecha":"2025-01-01"}]'),
  ('Titanium Edge Pro', 189.99, 86, 'Sport',   'Lentes deportivos anti-reflejo de titanio puro',       8, true,  true,  5, 'activo', '["Anti-reflejo","Titanio","Ultra-ligeros"]',      '[]', '[{"precio":189.99,"fecha":"2025-01-01"}]'),
  ('Aviator Luxe Retro',159.99, 72, 'Classic', 'Diseño vintage clásico inspirado en los años 70s',    5, true,  true,  5, 'activo', '["Vintage","Clásico","Elegante"]',                '[]', '[{"precio":159.99,"fecha":"2025-01-01"}]');
