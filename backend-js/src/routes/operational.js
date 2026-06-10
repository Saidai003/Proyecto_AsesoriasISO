const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { operational } = require('../controllers/operationalController');

router.get('/', requireAuth, requireRole('Responsable SGC'), operational);

module.exports = router;
