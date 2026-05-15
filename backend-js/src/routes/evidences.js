const Router = require('express').Router;
const router = Router();
const { requireAuth } = require('../middleware/auth');
const { listByRequisito } = require('../controllers/evidenceController');

router.get('/requisito/:id', requireAuth, listByRequisito);

module.exports = router;
