const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { updateAction, getActionHistory } = require('../controllers/accionesController');

// Update action state
router.patch('/:id', requireAuth, requireRoles('Responsable SGC', 'Admin'), updateAction);

// Get history (with optional filters)
router.get('/hist', requireAuth, getActionHistory);
// Debug route (no auth) to reproduce history query issues during development
router.get('/hist-debug', getActionHistory);

module.exports = router;
