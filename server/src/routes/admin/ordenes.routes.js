import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import {
  listarOrdenes,
  obtenerOrden,
  actualizarEstadoOrden,
} from '../../controllers/admin/ordenes.controller.js';

const router = Router();

// GET  /api/admin/ordenes
router.get('/', requireAuth, requireAdmin, listarOrdenes);

// GET  /api/admin/ordenes/:id
router.get('/:id', requireAuth, requireAdmin, obtenerOrden);

// PUT  /api/admin/ordenes/:id/estado
router.put('/:id/estado', requireAuth, requireAdmin, actualizarEstadoOrden);

export default router;
