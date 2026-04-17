-- ============================================================
-- RIXX — Notificación automática de stock bajo
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================
-- Esto crea una función que inserta en change_log cuando
-- el stock de un producto baja a 0 o ≤ 2 unidades.
-- Supabase puede enviar un email/webhook desde Database Webhooks.
-- ============================================================

-- ── Función: detectar stock crítico al actualizar ─────────────
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Stock agotado
  IF NEW.stock = 0 AND OLD.stock > 0 THEN
    INSERT INTO change_log (timestamp, tipo, product_id, nombre, operador, detalle)
    VALUES (
      TO_CHAR(NOW() AT TIME ZONE 'America/Montevideo', 'DD/MM/YYYY HH24:MI'),
      'AGOTADO',
      NEW.id,
      NEW.name,
      'sistema',
      'Stock llegó a 0 — producto agotado'
    );
  END IF;

  -- Stock crítico (≤ 2 unidades)
  IF NEW.stock > 0 AND NEW.stock <= 2 AND (OLD.stock > 2 OR OLD.stock IS NULL) THEN
    INSERT INTO change_log (timestamp, tipo, product_id, nombre, operador, detalle)
    VALUES (
      TO_CHAR(NOW() AT TIME ZONE 'America/Montevideo', 'DD/MM/YYYY HH24:MI'),
      'STOCK',
      NEW.id,
      NEW.name,
      'sistema',
      'Stock crítico: ' || NEW.stock || ' unidades restantes'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Trigger: se ejecuta en cada UPDATE de stock ───────────────
DROP TRIGGER IF EXISTS trg_low_stock ON products;
CREATE TRIGGER trg_low_stock
  AFTER UPDATE OF stock ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_low_stock();

-- ============================================================
-- OPCIONAL: Database Webhook para email
-- En Supabase Dashboard → Database → Webhooks → Create webhook:
--   Table: change_log
--   Events: INSERT
--   URL: tu endpoint (ej. Make.com, Zapier, o tu propio servidor)
--   Filtro: tipo IN ('AGOTADO', 'STOCK')
-- ============================================================
