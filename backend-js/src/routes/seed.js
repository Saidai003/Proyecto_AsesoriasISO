const Router = require('express').Router;
const router = Router();
const { seed } = require('../controllers/seedController');
const { requireAuth, requireRole } = require('../middleware/auth');

// Manual seeding changes application data and must never be publicly callable.
router.post('/', requireAuth, requireRole('Admin'), seed);

module.exports = router;
