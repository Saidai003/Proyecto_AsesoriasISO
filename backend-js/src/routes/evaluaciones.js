const Router = require('express').Router;
const router = Router();
const { getOrCreateEvaluacion, updateEvaluacionEstado, autoUpdateEstado } = require('../controllers/evaluationsController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Evaluador and Responsable SGC (and Admin) may get or create an evaluation row
router.get('/requisito/:id', requireAuth, requireRole('Evaluador','Responsable SGC', 'Admin'), getOrCreateEvaluacion);

// Update estado_cumplimiento (Evaluador can mark as NA to exclude from scope)
router.patch('/:id', requireAuth, requireRole('Evaluador', 'Admin'), updateEvaluacionEstado);

// Auto update estado_cumplimiento based on evidences and NCs (Accessible by both Evaluador and Responsable SGC)
router.post('/:id/auto-estado', requireAuth, requireRole('Evaluador', 'Responsable SGC', 'Admin'), autoUpdateEstado);

module.exports = router;
