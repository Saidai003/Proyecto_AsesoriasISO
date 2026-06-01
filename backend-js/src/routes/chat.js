const Router = require('express').Router
const router = Router()
const { requireAuth } = require('../middleware/auth')
const { getMessages, postMessage } = require('../controllers/chatController')
const { addClient } = require('../services/sse')
const { verifyAccessToken } = require('../auth')

// GET /api/chat?nc_id=123 or ?requisito_id=123
router.get('/', requireAuth, getMessages)

// POST /api/chat
router.post('/', requireAuth, postMessage)

// SSE stream endpoint - accepts token query param or Authorization header
router.get('/stream', (req, res) => {
  // allow token in query for EventSource since it cannot set headers
  const token = req.query && req.query.token
  let user = null
  if(token){
    try{ user = verifyAccessToken(token) }catch(e){ console.error('invalid token for sse', e) }
  }
  // register client
  addClient(req, res, user)
})

module.exports = router
