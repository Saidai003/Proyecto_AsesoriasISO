const Router = require('express').Router
const router = Router()
const { requireAuth } = require('../middleware/auth')
const { getMessages, postMessage } = require('../controllers/chatController')

// GET /api/chat?nc_id=123 or ?requisito_id=123
router.get('/', requireAuth, getMessages)

// POST /api/chat
router.post('/', requireAuth, postMessage)

// Real-time streaming is now handled via WebSocket on /ws
// (see src/services/ws.js and src/index.js)

module.exports = router
