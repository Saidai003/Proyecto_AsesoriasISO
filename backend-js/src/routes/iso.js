const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const { listISOs, getISOTree, getRequisitoById } = require('../controllers/isoController');

// list all ISOs
// router usually receives different types of arguments: path, middleware, handler. 
// Here we use requireAuth as middleware to protect the route, and listISOs as 
// the handler function that sends the response.
// if the middleware fails (e.g. user not authenticated), 
// it will send an error response and the handler won't be called.
router.get('/', requireAuth, requireRoles('Evaluador', 'Responsable SGC'), listISOs);

// NOTE: per API simplification, clients should use the ISO tree endpoint below.

// iso tree (clauses + nested requisitos)
router.get('/:id/tree', requireAuth, requireRoles('Evaluador', 'Responsable SGC'), getISOTree);

// requisito subtree by id
router.get('/requisitos/:id', requireAuth, requireRoles('Evaluador', 'Responsable SGC'), getRequisitoById);

module.exports = router;
