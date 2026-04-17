import { supabase } from '../../lib/supabase.js';
import { handleSupabaseError } from '../../lib/supabaseErrors.js';

// ── Constantes ─────────────────────────────────────────────────────────────

const CAMPOS_PERMITIDOS_PRODUCTO = [
  'nombre', 'descripcion', 'precio', 'precio_oferta',
  'categoria_id', 'genero', 'material_montura', 'material_lente',
  'proteccion_uv', 'destacado', 'activo',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar tildes
    .replace(/[^a-z0-9\s-]/g, '')     // solo alfanumérico y guiones
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Genera un slug único para un producto.
 * Si el slug base ya existe, agrega sufijo numérico (-2, -3, ...).
 * excludeId evita colisión con el propio producto al editar.
 */
async function generateUniqueSlug(nombre, excludeId = null) {
  const base = toSlug(nombre);
  let slug = base;
  let counter = 2;

  while (true) {
    let query = supabase
      .from('productos')
      .select('id')
      .eq('slug', slug);

    if (excludeId) query = query.neq('id', excludeId);

    const { data } = await query.maybeSingle();
    if (!data) break;  // slug disponible
    slug = `${base}-${counter++}`;
  }

  return slug;
}

// ── GET /admin/productos ───────────────────────────────────────────────────
export async function listarProductos(req, res) {
  try {
    const {
      pagina = 1,
      limite = 20,
      activo,
      categoria_id,
      busqueda,
    } = req.query;

    const pag = Math.max(1, parseInt(pagina));
    const lim = Math.min(100, Math.max(1, parseInt(limite)));
    const from = (pag - 1) * lim;
    const to   = from + lim - 1;

    let query = supabase
      .from('productos')
      .select(`
        id, nombre, slug, descripcion, precio, precio_oferta, genero,
        material_montura, material_lente, proteccion_uv, destacado, activo, creado_en,
        categoria:categoria_id(id, nombre),
        variantes_producto(id, stock, activo)
      `, { count: 'exact' })
      .order('creado_en', { ascending: false })
      .range(from, to);

    // En el endpoint admin NO se filtra por activo=true obligatoriamente
    if (activo !== undefined && activo !== '') {
      query = query.eq('activo', activo === 'true' || activo === true);
    }
    if (categoria_id) query = query.eq('categoria_id', categoria_id);
    if (busqueda)     query = query.ilike('nombre', `%${busqueda}%`);

    const { data, count, error } = await query;
    if (error) throw error;

    const productos = data.map(p => {
      const variantes = p.variantes_producto ?? [];
      return {
        ...p,
        variantes_producto: undefined,
        conteo_variantes: variantes.length,
        stock_total: variantes.reduce((sum, v) => sum + (v.stock || 0), 0),
      };
    });

    return res.json({
      data: {
        productos,
        total: count,
        pagina: pag,
        limite: lim,
        paginas_total: Math.ceil(count / lim),
      },
      error: false,
      message: 'Productos obtenidos correctamente',
    });
  } catch (err) {
    console.error('[Productos.listar]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al obtener productos',
    });
  }
}

// ── POST /admin/productos ──────────────────────────────────────────────────
export async function crearProducto(req, res) {
  try {
    const {
      nombre, descripcion, precio, precio_oferta,
      categoria_id, genero, material_montura, material_lente,
      proteccion_uv, destacado = false, activo = true,
    } = req.body;

    if (!nombre || precio === undefined || !categoria_id || !genero) {
      return res.status(400).json({
        data: null, error: true,
        message: 'Campos obligatorios: nombre, precio, categoria_id, genero',
      });
    }

    const slug = await generateUniqueSlug(nombre);

    const { data: producto, error } = await supabase
      .from('productos')
      .insert({
        nombre,
        slug,
        descripcion,
        precio,
        precio_oferta: precio_oferta ?? null,
        categoria_id,
        genero,
        material_montura,
        material_lente,
        proteccion_uv,
        destacado,
        activo,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      data: producto,
      error: false,
      message: 'Producto creado correctamente',
    });
  } catch (err) {
    console.error('[Productos.crear]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al crear el producto',
    });
  }
}

// ── PUT /admin/productos/:id ───────────────────────────────────────────────
export async function actualizarProducto(req, res) {
  try {
    const { id } = req.params;
    const camposRaw = req.body;

    // Whitelist: solo campos explícitamente permitidos
    const campos = Object.fromEntries(
      Object.entries(camposRaw).filter(([k]) => CAMPOS_PERMITIDOS_PRODUCTO.includes(k))
    );

    if (Object.keys(campos).length === 0) {
      return res.status(400).json({
        data: null, error: true,
        message: `No se enviaron campos válidos. Campos permitidos: ${CAMPOS_PERMITIDOS_PRODUCTO.join(', ')}`,
      });
    }

    // Verificar que el producto existe
    const { data: productoActual, error: fetchError } = await supabase
      .from('productos')
      .select('id, nombre, activo')
      .eq('id', id)
      .single();

    if (fetchError) return handleSupabaseError(fetchError, res, 'Producto no encontrado');

    // Si se intenta desactivar, verificar que no haya órdenes activas
    if (campos.activo === false || campos.activo === 'false') {
      const { data: variantesDelProducto, error: ve } = await supabase
        .from('variantes_producto')
        .select('id')
        .eq('producto_id', id);
      if (ve) throw ve;

      if (variantesDelProducto?.length > 0) {
        const varIds = variantesDelProducto.map(v => v.id);

        const { data: ordenesActivas, error: oe } = await supabase
          .from('ordenes')
          .select('id')
          .in('estado', ['en_preparacion', 'enviado']);
        if (oe) throw oe;

        if (ordenesActivas?.length > 0) {
          const ordenIds = ordenesActivas.map(o => o.id);
          const { count, error: ie } = await supabase
            .from('items_orden')
            .select('id', { count: 'exact', head: true })
            .in('variante_id', varIds)
            .in('orden_id', ordenIds);
          if (ie) throw ie;

          if (count > 0) {
            return res.status(400).json({
              data: null, error: true,
              message: 'No se puede desactivar: el producto tiene órdenes en preparación o enviadas',
            });
          }
        }
      }
    }

    // Regenerar slug si cambia el nombre
    const updates = { ...campos };
    if (campos.nombre && campos.nombre !== productoActual.nombre) {
      updates.slug = await generateUniqueSlug(campos.nombre, id);
    }

    const { data: productoActualizado, error: updateError } = await supabase
      .from('productos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return res.json({
      data: productoActualizado,
      error: false,
      message: 'Producto actualizado correctamente',
    });
  } catch (err) {
    console.error('[Productos.actualizar]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al actualizar el producto',
    });
  }
}

// ── DELETE /admin/productos/:id (soft delete) ──────────────────────────────
export async function desactivarProducto(req, res) {
  try {
    const { id } = req.params;

    const { error: fetchError } = await supabase
      .from('productos')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError) return handleSupabaseError(fetchError, res, 'Producto no encontrado');

    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id);

    if (error) throw error;

    return res.json({
      data: null,
      error: false,
      message: 'Producto desactivado correctamente',
    });
  } catch (err) {
    console.error('[Productos.desactivar]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al desactivar el producto',
    });
  }
}

// ── POST /admin/productos/:id/variantes ────────────────────────────────────
export async function crearVariante(req, res) {
  try {
    const { id: producto_id } = req.params;
    const { color_montura, color_lente, stock, sku } = req.body;

    if (!sku) {
      return res.status(400).json({
        data: null, error: true,
        message: 'El campo SKU es obligatorio',
      });
    }

    // Verificar que el producto existe
    const { data: producto, error: pe } = await supabase
      .from('productos')
      .select('id')
      .eq('id', producto_id)
      .single();

    if (pe) return handleSupabaseError(pe, res, 'Producto no encontrado');

    // Verificar unicidad del SKU
    const { data: skuExistente } = await supabase
      .from('variantes_producto')
      .select('id')
      .eq('sku', sku)
      .maybeSingle();

    if (skuExistente) {
      return res.status(400).json({
        data: null, error: true,
        message: `El SKU '${sku}' ya está en uso`,
      });
    }

    const { data: variante, error } = await supabase
      .from('variantes_producto')
      .insert({
        producto_id,
        color_montura,
        color_lente,
        stock: stock ?? 0,
        sku,
        activo: true,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      data: variante,
      error: false,
      message: 'Variante creada correctamente',
    });
  } catch (err) {
    console.error('[Productos.crearVariante]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al crear la variante',
    });
  }
}

// ── PUT /admin/productos/:id/variantes/:varianteId ─────────────────────────
export async function actualizarVariante(req, res) {
  try {
    const { id: producto_id, varianteId } = req.params;
    const campos = req.body;

    if (Object.keys(campos).length === 0) {
      return res.status(400).json({
        data: null, error: true,
        message: 'No se enviaron campos para actualizar',
      });
    }

    // Verificar que la variante pertenece al producto
    const { data: varianteActual, error: fe } = await supabase
      .from('variantes_producto')
      .select('id, sku')
      .eq('id', varianteId)
      .eq('producto_id', producto_id)
      .single();

    if (fe) return handleSupabaseError(fe, res, 'Variante no encontrada para este producto');

    // Si se cambia el SKU, verificar unicidad
    if (campos.sku && campos.sku !== varianteActual.sku) {
      const { data: skuExistente } = await supabase
        .from('variantes_producto')
        .select('id')
        .eq('sku', campos.sku)
        .neq('id', varianteId)
        .maybeSingle();

      if (skuExistente) {
        return res.status(400).json({
          data: null, error: true,
          message: `El SKU '${campos.sku}' ya está en uso`,
        });
      }
    }

    const updates = { ...campos };
    delete updates.id;
    delete updates.producto_id;

    const { data: varianteActualizada, error } = await supabase
      .from('variantes_producto')
      .update(updates)
      .eq('id', varianteId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      data: varianteActualizada,
      error: false,
      message: 'Variante actualizada correctamente',
    });
  } catch (err) {
    console.error('[Productos.actualizarVariante]', err);
    return res.status(500).json({
      data: null, error: true,
      message: err.message ?? 'Error al actualizar la variante',
    });
  }
}
