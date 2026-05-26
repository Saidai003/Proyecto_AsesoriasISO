const Router = require('express').Router
const router = Router()
const { requireAuth } = require('../middleware/auth')
const { listNotifications, markRead, clearForRequisito } = require('../controllers/notificationsController')

router.get('/', requireAuth, listNotifications)
router.patch('/:id/read', requireAuth, markRead)
router.post('/for-requisito/:id/clear', requireAuth, clearForRequisito)

module.exports = router
