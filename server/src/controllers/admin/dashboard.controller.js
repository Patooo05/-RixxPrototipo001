import { supabase } from '../../lib/supabase.js';

const ESTADOS_PAGADOS = ['pago_confirmado', 'en_preparacion', 'enviado', 'entregado'];

/** Divide un array en sub-arrays de `size` elementos */
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function getDashboard(req, res) {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // ── 1. Órdenes de hoy (todas las que empezaron hoy) ───────────────
    const { data: ordenesHoy, error: e1 } = await supabase
      .from('ordenes')
      .select('total, estado')
      .gte('creado_en', todayStart);
    if (e1) throw e1;

    const ventas_hoy = ordenesHoy
      .filter(o => ESTADOS_PAGADOS.includes(o.estado))
      .reduce((sum, o) => sum + Number(o.total), 0);
    const ordenes_hoy = ordenesHoy.length;

    // ── 2. Ventas del mes actual ──────────────────────────────────────
    const { data: ordenesMes, error: e2 } = await supabase
      .from('ordenes')
      .select('total, estado')
      .gte('creado_en', monthStart);
    if (e2) throw e2;

    const ventas_mes = ordenesMes
      .filter(o => ESTADOS_PAGADOS.includes(o.estado))
      .reduce((sum, o) => sum + Number(o.total), 0);

    // ── 3. Órdenes pendientes ─────────────────────────────────────────
    const { count: ordenes_pendientes, error: e3 } = await supabase
      .from('ordenes')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente');
    if (e3) throw e3;

    // ── 4. Total de clientes ──────────────────────────────────────────
    const { count: clientes_total, error: e4 } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('rol', 'cliente');
    if (e4) throw e4;

    // ── 5. Órdenes agrupadas por estado ───────────────────────────────
    const { data: todasOrdenes, error: e5 } = await supabase
      .from('ordenes')
      .select('estado');
    if (e5) throw e5;

    const estadosMap = {};
    todasOrdenes.forEach(o => {
      estadosMap[o.estado] = (estadosMap[o.estado] || 0) + 1;
    });
    const ordenes_por_estado = Object.entries(estadosMap)
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => a.estado.localeCompare(b.estado));

    // ── 6. Productos más vendidos (top 5) ─────────────────────────────
    // Paso 1: IDs de órdenes con pago confirmado o más
    const { data: ordenesPagas, error: e6 } = await supabase
      .from('ordenes')
      .select('id')
      .in('estado', ESTADOS_PAGADOS);
    if (e6) throw e6;

    let productos_mas_vendidos = [];
    if (ordenesPagas.length > 0) {
      const ordenIds = ordenesPagas.map(o => o.id);

      // Paso 2: Items en batches de 500 para no superar el límite de URL de PostgREST
      const chunks = chunkArray(ordenIds, 500);
      const chunkResults = await Promise.all(
        chunks.map(chunk =>
          supabase
            .from('items_orden')
            .select(`
              cantidad,
              variante:variante_id(
                producto:producto_id(id, nombre)
              )
            `)
            .in('orden_id', chunk)
        )
      );

      // Verificar errores en algún chunk
      const chunkError = chunkResults.find(r => r.error);
      if (chunkError) throw chunkError.error;

      const items = chunkResults.flatMap(r => r.data ?? []);

      // Agregar por producto
      const productSales = {};
      items.forEach(item => {
        const prod = item.variante?.producto;
        if (!prod) return;
        if (!productSales[prod.id]) {
          productSales[prod.id] = { producto_id: prod.id, nombre: prod.nombre, total_vendido: 0 };
        }
        productSales[prod.id].total_vendido += item.cantidad;
      });

      productos_mas_vendidos = Object.values(productSales)
        .sort((a, b) => b.total_vendido - a.total_vendido)
        .slice(0, 5);
    }

    // ── 7. Stock crítico (stock <= 3, variantes activas) ──────────────
    const { data: variantesCriticas, error: e8 } = await supabase
      .from('variantes_producto')
      .select(`
        id, sku, color_montura, color_lente, stock,
        producto:producto_id(nombre)
      `)
      .lte('stock', 3)
      .eq('activo', true)
      .order('stock', { ascending: true });
    if (e8) throw e8;

    const stock_critico = variantesCriticas.map(v => ({
      variante_id: v.id,
      sku: v.sku,
      producto_nombre: v.producto?.nombre ?? null,
      color_montura: v.color_montura,
      color_lente: v.color_lente,
      stock: v.stock,
    }));

    // ── Respuesta ─────────────────────────────────────────────────────
    return res.json({
      data: {
        resumen: {
          ventas_hoy,
          ventas_mes,
          ordenes_hoy,
          ordenes_pendientes: ordenes_pendientes ?? 0,
          clientes_total: clientes_total ?? 0,
        },
        ordenes_por_estado,
        productos_mas_vendidos,
        stock_critico,
      },
      error: false,
      message: 'Dashboard cargado correctamente',
    });
  } catch (err) {
    console.error('[Dashboard]', err);
    return res.status(500).json({
      data: null,
      error: true,
      message: err.message ?? 'Error al cargar el dashboard',
    });
  }
}
