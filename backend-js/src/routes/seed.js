const Router = require('express').Router;
const router = Router();
const { seed } = require('../controllers/seedController');

router.post('/', seed);

module.exports = router;
