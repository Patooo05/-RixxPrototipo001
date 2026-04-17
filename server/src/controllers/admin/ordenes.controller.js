import { supabase } from '../../lib/supabase.js';
import { handleSupabaseError } from '../../lib/supabaseErrors.js';

const ESTADOS_VALIDOS = ['pendiente', 'pago_confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'];

// Estado actual → estados a los que puede transicionar
const TRANSICIONES_VALIDAS = {
  pendiente:        ['pago_confirmado', 'cancelado'],
  pago_confirmado:  ['en_preparacion', 'cancelado'],
  en_preparacion:   ['enviado'],
  enviado:          ['entregado'],
  entregado:        [],
  cancelado:        [],
};

// ── GET /admin/ordenes ─────────────────────────────────────────────────────
export async function listarOrdenes(req, res) {
  try {
    const {
      estado,
      pagina = 1,
      limite = 20,
      fecha_desde,
      fecha_hasta,
    } = req.query;

    const pag = Math.max(1, parseInt(pagina));
    const lim = Math.min(100, Math.max(1, parseInt(limite)));
    const from = (pag - 1) * lim;
    const to   = from + lim - 1;

    let query = supabase
      .from('ordenes')
      .select(`
        id, estado, subtotal, costo_envio, total, metodo_pago, notas, creado_en, actualizado_en,
        usuario:usuario_id(id, nombre, apellido, email)
      `, { count: 'exact' })
      .order('creado_en', { ascending: false })
      .range(from, to);

    if (estado) {
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
          data: null, error: true,
          message: `Estado inválido. Valores posibles: ${ESTADOS_VALIDOS.join(', ')}`,
        });
      }
      query = query.eq('estado', estado);
    }

    if (fecha_desde) query = query.gte('creado_en', fecha_desde);
    if (fecha_hasta) query = query.lte('creado_en', fecha_hasta);

    const { data, count, error } = await query;
    if (error) throw error;

    return res.json({
      data: {
        ordenes: data,
        total: count,
        pagina: pag,
        limite: lim,
        paginas_total: Math.ceil(count / lim),
      },
      error: false,
      message: 'Órdenes obtenidas correctamente',
    });
  } catch (err) {
    console.error('[Ordenes.listar]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al obtener órdenes',
    });
  }
}

// ── GET /admin/ordenes/:id ─────────────────────────────────────────────────
export async function obtenerOrden(req, res) {
  try {
    const { id } = req.params;

    const { data: orden, error } = await supabase
      .from('ordenes')
      .select(`
        id, estado, subtotal, costo_envio, total, metodo_pago, pago_id, notas, creado_en, actualizado_en,
        usuario:usuario_id(id, nombre, apellido, email, telefono),
        direccion:direccion_id(
          calle, numero, apartamento, ciudad, departamento, codigo_postal, pais
        ),
        items:items_orden(
          id, cantidad, precio_unitario,
          variante:variante_id(
            id, sku, color_montura, color_lente, stock,
            producto:producto_id(id, nombre, slug)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) return handleSupabaseError(error, res, 'Orden no encontrada');

    return res.json({
      data: orden,
      error: false,
      message: 'Orden obtenida correctamente',
    });
  } catch (err) {
    console.error('[Ordenes.obtener]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al obtener la orden',
    });
  }
}

// ── PUT /admin/ordenes/:id/estado ──────────────────────────────────────────
export async function actualizarEstadoOrden(req, res) {
  try {
    const { id } = req.params;
    const { estado: nuevoEstado } = req.body;

    // Validar que el nuevo estado existe
    if (!nuevoEstado || !ESTADOS_VALIDOS.includes(nuevoEstado)) {
      return res.status(400).json({
        data: null, error: true,
        message: `Estado inválido. Valores posibles: ${ESTADOS_VALIDOS.join(', ')}`,
      });
    }

    // Obtener estado actual
    const { data: orden, error: fetchError } = await supabase
      .from('ordenes')
      .select('id, estado')
      .eq('id', id)
      .single();

    if (fetchError) return handleSupabaseError(fetchError, res, 'Orden no encontrada');

    const estadoActual = orden.estado;

    // Validar transición
    const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] ?? [];
    if (!transicionesPermitidas.includes(nuevoEstado)) {
      return res.status(400).json({
        data: null, error: true,
        message: `Transición inválida: '${estadoActual}' → '${nuevoEstado}'. ` +
          (transicionesPermitidas.length > 0
            ? `Transiciones permitidas desde '${estadoActual}': ${transicionesPermitidas.join(', ')}`
            : `La orden en estado '${estadoActual}' ya no puede cambiar de estado`),
      });
    }

    // Actualizar
    const { data: ordenActualizada, error: updateError } = await supabase
      .from('ordenes')
      .update({
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      data: ordenActualizada,
      error: false,
      message: `Estado actualizado: '${estadoActual}' → '${nuevoEstado}'`,
    });
  } catch (err) {
    console.error('[Ordenes.actualizarEstado]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al actualizar el estado',
    });
  }
}
