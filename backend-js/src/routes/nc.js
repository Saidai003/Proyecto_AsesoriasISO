const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { createNC, deleteNC, listByEvaluacion } = require('../controllers/ncController');

// create NC (evaluator or admin)
router.post('/', requireAuth, requireRoles('Evaluador'), createNC);
// delete NC (evaluator or admin)
router.delete('/:id', requireAuth, requireRoles('Evaluador'), deleteNC);
// list NCs for an evaluacion
router.get('/evaluacion/:id', requireAuth, listByEvaluacion);

module.exports = router;
