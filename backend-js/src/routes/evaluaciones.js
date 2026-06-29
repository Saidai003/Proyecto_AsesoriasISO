const Router = require('express').Router;
const router = Router();
const { getOrCreateEvaluacion, updateEvaluacionEstado } = require('../controllers/evaluationsController');
const { requireAuth, requireRoles } = require('../middleware/auth');

// Evaluador and Responsable SGC (and Admin) may get or create an evaluation row
router.get('/requisito/:id', requireAuth, requireRoles('Evaluador','Responsable SGC'), getOrCreateEvaluacion);

// Update estado_cumplimiento (Evaluador can mark as NA to exclude from scope)
router.patch('/:id', requireAuth, requireRoles('Evaluador'), updateEvaluacionEstado);

module.exports = router;
