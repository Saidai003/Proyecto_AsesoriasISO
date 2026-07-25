const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Proteger todas las rutas de dashboards con autenticación
router.use(requireAuth);

// GET /api/dashboards/admin
router.get('/admin', requireRole('Admin'), dashboardController.getAdminDashboard);

// GET /api/dashboards/evaluator
router.get('/evaluator', requireRole('Evaluador', 'Admin'), dashboardController.getEvaluatorDashboard);

// GET /api/dashboards/responsible
router.get('/responsible', requireRole('Responsable SGC', 'Admin'), dashboardController.getResponsibleDashboard);

module.exports = router;