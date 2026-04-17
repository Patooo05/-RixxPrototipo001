-- ============================================================
-- Rixx Lentes — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ── 1. PRODUCTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name          TEXT          NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  precio_costo  NUMERIC(10,2),
  image         TEXT,                          -- URL (Supabase Storage or external)
  category      TEXT,
  description   TEXT,
  stock         INTEGER       DEFAULT 0,
  featured      BOOLEAN       DEFAULT false,
  is_new        BOOLEAN       DEFAULT false,
  rating        NUMERIC(3,1)  DEFAULT 0,
  status        TEXT          DEFAULT 'activo', -- 'activo' | 'pausado' | 'agotado'
  characteristics JSONB       DEFAULT '[]',
  images        JSONB         DEFAULT '[]',     -- array of URL strings
  variants      JSONB         DEFAULT '[]',
  descuento     JSONB,                          -- { porcentaje, hasta } | null
  price_history JSONB         DEFAULT '[]',     -- [{ precio, fecha }]
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- RLS: anyone can read active products; only service role can write
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "products_admin_all"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Administrador'
    )
  );


-- ── 2. USER PROFILES ─────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  role        TEXT          DEFAULT 'Cliente',  -- 'Cliente' | 'Administrador'
  active      BOOLEAN       DEFAULT true,
  permissions JSONB         DEFAULT '[]',
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- RLS: users can read/update their own profile; admins can read all
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_read_update"
  ON public.user_profiles FOR ALL
  USING (id = auth.uid());

CREATE POLICY "profiles_admin_read_all"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Administrador'
    )
  );

CREATE POLICY "profiles_admin_update_all"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Administrador'
    )
  );


-- ── 3. ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id       UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  items         JSONB         NOT NULL,          -- snapshot of cart items at purchase time
  total         NUMERIC(10,2) NOT NULL,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  status        TEXT          DEFAULT 'pendiente', -- 'pendiente' | 'procesando' | 'enviado' | 'entregado' | 'cancelado'
  notes         TEXT,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_own_read"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders_own_insert"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Administrador'
    )
  );


-- ── 4. CHANGE LOG ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.change_log (
  id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  timestamp  TEXT,                              -- formatted local time string
  tipo       TEXT,                              -- 'ALTA' | 'BAJA' | 'MODIFICACIÓN' | 'DESTACADO' | 'STATUS' | 'DESCUENTO'
  product_id BIGINT,
  nombre     TEXT,
  operador   TEXT,
  detalle    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "change_log_admin_all"
  ON public.change_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'Administrador'
    )
  );


-- ── 5. TRIGGER: auto-create user_profile on signup ───────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Cliente')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── 6. SEED: initial products ─────────────────────────────────
-- Replace image URLs with your actual Supabase Storage URLs after uploading.
-- The app falls back to bundled local images when VITE_SUPABASE_URL is not set.
INSERT INTO public.products
  (name, price, precio_costo, image, category, description, stock, featured, is_new, rating, status, characteristics, images, variants, descuento, price_history)
VALUES
  ('Vintage A',         120,    54, '/img/1.webp', 'Classic', 'Diseño clásico atemporal con montura fina',                3, false, false, 4, 'activo', '["Montura fina","UV400","Ligeros"]',           '[]', '[]', null, '[{"precio":120,"fecha":"2025-01-01"}]'),
  ('Vintage B',         150,    68, '/img/2.webp', 'Classic', 'Lentes vintage de edición limitada premium',               0, true,  false, 5, 'activo', '["Edición limitada","Clásico","Premium"]',      '[]', '[]', null, '[{"precio":150,"fecha":"2025-01-01"}]'),
  ('Urban Shield',       99,    44, '/img/3.webp', 'Sport',   'Resistentes y ligeros para el día a día urbano',           5, false, false, 4, 'activo', '["Anti-impacto","Ligeros","Resistentes"]',      '[]', '[]', null, '[{"precio":99,"fecha":"2025-01-01"}]'),
  ('Night Vision',      135,    61, '/img/4.webp', 'Sport',   'Alto contraste para uso nocturno y deportivo',             2, true,  false, 4, 'activo', '["Alto contraste","Anti-reflejo","Sport"]',     '[]', '[]', null, '[{"precio":135,"fecha":"2025-01-01"}]'),
  ('Gold Frame',        175,    80, '/img/5.webp', 'Luxury',  'Montura dorada con cristales de lujo premium',             4, true,  false, 5, 'activo', '["Montura dorada","Cristales premium","Lujo"]', '[]', '[]', null, '[{"precio":175,"fecha":"2025-01-01"}]'),
  ('Classic Elite',     145,    65, '/img/6.webp', 'Classic', 'Elegancia clásica para el estilo contemporáneo',           6, false, false, 4, 'activo', '["Elegante","Clásico","Versátil"]',             '[]', '[]', null, '[{"precio":145,"fecha":"2025-01-01"}]'),
  ('Titanium Edge Pro', 189.99, 86, '/img/7.webp', 'Sport',   'Lentes deportivos anti-reflejo de titanio puro',           8, true,  true,  5, 'activo', '["Anti-reflejo","Titanio","Ultra-ligeros"]',    '[]', '[]', null, '[{"precio":189.99,"fecha":"2025-01-01"}]'),
  ('Aviator Luxe Retro',159.99, 72, '/img/8.webp', 'Classic', 'Diseño vintage clásico inspirado en los años 70s',         5, true,  true,  5, 'activo', '["Vintage","Clásico","Elegante"]',              '[]', '[]', null, '[{"precio":159.99,"fecha":"2025-01-01"}]');


-- ── 7. SEED: admin user ───────────────────────────────────────
-- 1. Go to Supabase Dashboard → Authentication → Users → "Invite user" or use the API
-- 2. Create user with email: admin@admin.com and password: 1234
-- 3. Then run this to grant admin role (replace the UUID with the actual user ID):
--
-- UPDATE public.user_profiles
-- SET role = 'Administrador', name = 'Admin'
-- WHERE email = 'admin@admin.com';
