import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  crearVariante,
  actualizarVariante,
} from '../../controllers/admin/productos.controller.js';

const router = Router();

// GET    /api/admin/productos
router.get('/',    requireAuth, requireAdmin, listarProductos);

// POST   /api/admin/productos
router.post('/',   requireAuth, requireAdmin, crearProducto);

// PUT    /api/admin/productos/:id
router.put('/:id', requireAuth, requireAdmin, actualizarProducto);

// DELETE /api/admin/productos/:id  (soft delete)
router.delete('/:id', requireAuth, requireAdmin, desactivarProducto);

// POST   /api/admin/productos/:id/variantes
router.post('/:id/variantes', requireAuth, requireAdmin, crearVariante);

// PUT    /api/admin/productos/:id/variantes/:varianteId
router.put('/:id/variantes/:varianteId', requireAuth, requireAdmin, actualizarVariante);

export default router;
