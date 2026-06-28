const Router = require('express').Router;
const router = Router();
const { login, refresh, logout, firstLoginPasswordChange } = require('../controllers/authController');

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/first-login-password', firstLoginPasswordChange);

module.exports = router;
