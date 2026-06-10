const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { evaluator } = require('../controllers/evaluatorController');

router.get('/', requireAuth, requireRole('Evaluador'), evaluator);

module.exports = router;
