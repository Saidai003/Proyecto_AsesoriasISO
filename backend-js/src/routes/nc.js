const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { createNC, deleteNC, listByEvaluacion, updateNC, listActions, createAction, getNC } = require('../controllers/ncController');

// create NC (evaluator or admin)
router.post('/', requireAuth, requireRoles('Evaluador'), createNC);
// delete NC (evaluator or admin)
router.delete('/:id', requireAuth, requireRoles('Evaluador'), deleteNC);
// list NCs for an evaluacion
router.get('/evaluacion/:id', requireAuth, listByEvaluacion);
// get single NC
router.get('/:id', requireAuth, getNC);
// update NC (flow/validation)
router.patch('/:id', requireAuth, updateNC);
// corrective actions
router.get('/:id/acciones', requireAuth, listActions);
router.post('/:id/acciones', requireAuth, createAction);

module.exports = router;
