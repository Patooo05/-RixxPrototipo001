import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';
import { getDashboard } from '../../controllers/admin/dashboard.controller.js';

const router = Router();

// GET /api/admin/dashboard
router.get('/', requireAuth, requireAdmin, getDashboard);

export default router;
