import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import dashboardRoutes  from './admin/dashboard.routes.js';
import ordenesRoutes    from './admin/ordenes.routes.js';
import productosRoutes  from './admin/productos.routes.js';
import emailRoutes      from './email.routes.js';

const router = Router();

// ── Rate limiting para todas las rutas admin ──────────────────────────────
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // ventana de 15 minutos
  max: 100,                   // máx 100 requests por IP por ventana
  standardHeaders: true,      // RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: {
    data: null,
    error: true,
    message: 'Demasiadas solicitudes desde esta IP, intentá de nuevo en 15 minutos',
  },
});

// ── Admin ─────────────────────────────────────────────────────────────────
router.use('/admin', adminLimiter);
router.use('/admin/dashboard',  dashboardRoutes);
router.use('/admin/ordenes',    ordenesRoutes);
router.use('/admin/productos',  productosRoutes);

// ── Email / WhatsApp ──────────────────────────────────────────
router.use('/email', emailRoutes);

export default router;
