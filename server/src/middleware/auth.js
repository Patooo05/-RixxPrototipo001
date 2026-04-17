import { supabase } from '../lib/supabase.js';

/**
 * Verifica que el request tenga un JWT válido de Supabase Auth.
 * Adjunta el usuario autenticado en req.authUser.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      data: null,
      error: true,
      message: 'Token de autenticación requerido',
    });
  }

  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        data: null,
        error: true,
        message: 'Token inválido o expirado',
      });
    }
    req.authUser = user;
    next();
  } catch (err) {
    return res.status(401).json({
      data: null,
      error: true,
      message: 'Error al verificar autenticación',
    });
  }
}

/**
 * Verifica que el usuario autenticado tenga rol 'admin' en la tabla usuarios.
 * Debe usarse después de requireAuth.
 */
export async function requireAdmin(req, res, next) {
  if (!req.authUser) {
    return res.status(401).json({
      data: null,
      error: true,
      message: 'No autenticado',
    });
  }

  try {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', req.authUser.id)
      .single();

    if (error || !usuario || usuario.rol !== 'admin') {
      return res.status(403).json({
        data: null,
        error: true,
        message: 'Acceso denegado: se requiere rol admin',
      });
    }
    next();
  } catch (err) {
    return res.status(403).json({
      data: null,
      error: true,
      message: 'Error al verificar permisos de admin',
    });
  }
}
