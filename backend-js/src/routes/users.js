const Router = require('express').Router;
const router = Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { createUser, listUsers } = require('../controllers/userController');

router.post('/', createUser);
router.get('/', requireAuth, requireRole('Admin'), listUsers);

module.exports = router;
