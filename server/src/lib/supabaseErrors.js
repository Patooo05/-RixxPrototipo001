/**
 * Mapeo de códigos de error PostgREST / PostgreSQL a respuestas HTTP.
 * Referencia: https://postgrest.org/en/stable/references/errors.html
 */
const CODE_MAP = {
  PGRST116: [404, 'Recurso no encontrado'],          // 0 o +1 filas cuando se esperaba exactamente 1
  PGRST301: [401, 'JWT expirado o inválido'],
  '23503':  [400, 'Referencia inválida: el recurso relacionado no existe (FK violation)'],
  '23505':  [409, 'Ya existe un registro con ese valor único (SKU, slug, email, etc.)'],
  '23502':  [400, 'Falta un campo obligatorio (NOT NULL violation)'],
  '22P02':  [400, 'Formato de dato inválido (UUID, número, etc.)'],
  '42501':  [403, 'Sin permisos para realizar esta operación'],
};

/**
 * Traduce un error de Supabase/PostgREST a una respuesta HTTP con formato estándar.
 *
 * @param {object} err       - Objeto de error devuelto por Supabase
 * @param {object} res       - Response object de Express
 * @param {string} fallbackMsg - Mensaje de fallback si el código no está mapeado
 */
export function handleSupabaseError(err, res, fallbackMsg = 'Error interno del servidor') {
  const [status, defaultMsg] = CODE_MAP[err.code] ?? [500, fallbackMsg];
  return res.status(status).json({
    data: null,
    error: true,
    message: err.message ?? defaultMsg,
  });
}
