const Router = require('express').Router;
const router = Router();
const { getOrCreateEvaluacion } = require('../controllers/evaluationsController');
const { requireAuth, requireRoles } = require('../middleware/auth');

// Evaluador and Responsable SGC (and Admin) may get or create an evaluation row
router.get('/requisito/:id', requireAuth, requireRoles('Evaluador','Responsable SGC'), getOrCreateEvaluacion);

module.exports = router;
