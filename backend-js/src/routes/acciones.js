const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { updateAction, getActionHistory, getAccionesByEvaluacion } = require('../controllers/accionesController');

// Update action state
router.patch('/:id', requireAuth, requireRoles('Responsable SGC', 'Admin'), updateAction);

// Get history (with optional filters)
router.get('/hist', requireAuth, getActionHistory);
// Debug route (no auth) to reproduce history query issues during development
router.get('/hist-debug', getActionHistory);

// List acciones related to an evaluacion (used for chat attachments)
router.get('/evaluacion/:id', requireAuth, getAccionesByEvaluacion);

module.exports = router;
