const express = require('express');
const router = express.Router();

// Ajusta la ruta de importación de tu auth según corresponda 
// (basado en nc.js parece ser '../middleware/auth' o '../auth' según index.js)
const { requireAuth, requireRoles } = require('../middleware/auth'); 
const dashboardController = require('../controllers/dashboardController');

// GET /api/dashboards/admin
router.get('/admin', requireAuth, requireRoles('Admin'), dashboardController.getAdminDashboard);

// GET /api/dashboards/evaluator
// Permitimos a Evaluador, pero también a Admin por si quiere ver esta vista
router.get('/evaluator', requireAuth, requireRoles('Evaluador', 'Admin'), dashboardController.getEvaluatorDashboard);

// GET /api/dashboards/operative
// Permitimos roles operativos, Responsable SGC, y Admin
router.get('/operative', requireAuth, requireRoles('Responsable SGC', 'Admin'), dashboardController.getOperativeDashboard);

module.exports = router;