const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { updateAction, deleteAction, getActionHistory, getAccionesByEvaluacion } = require('../controllers/accionesController');

// Update action state
router.patch('/:id', requireAuth, requireRoles('Responsable SGC', 'Admin'), updateAction);

// Delete action and its descendants
router.delete('/:id', requireAuth, requireRoles('Responsable SGC', 'Admin'), deleteAction);

// Get history (with optional filters)
router.get('/hist', requireAuth, getActionHistory);

// List acciones related to an evaluacion (used for chat attachments)
router.get('/evaluacion/:id', requireAuth, getAccionesByEvaluacion);

module.exports = router;
