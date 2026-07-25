const express = require('express')
const router = express.Router()
const driveService = require('../services/driveService')
const { requireAuth, requireRole } = require('../middleware/auth')

// Returns an authorization URL to initiate OAuth2 flow
router.get('/authurl', requireAuth, requireRole('Evaluador', 'Responsable SGC'), (req, res) => {
  try{
    const url = driveService.generateAuthUrl()
    return res.json({ url })
  }catch(err){
    console.error('generateAuthUrl error', err.message || err)
    return res.status(500).json({ error: 'drive_auth_unavailable', message: err.message })
  }
})

// Direct redirect to the Google consent screen (convenience endpoint)
router.get('/auth', requireAuth, requireRole('Evaluador', 'Responsable SGC'), (req, res) => {
  try{
    const url = driveService.generateAuthUrl()
    return res.redirect(url)
  }catch(err){
    console.error('generateAuthUrl redirect error', err.message || err)
    return res.status(500).send('drive_auth_unavailable')
  }
})

// Exchange an authorization code for tokens and save them server-side
router.post('/token', requireAuth, requireRole('Evaluador', 'Responsable SGC'), async (req, res) => {
  const code = req.body && req.body.code
  if(!code) return res.status(400).json({ error: 'missing_code' })
  try{
    const tokens = await driveService.getTokenFromCode(code)
    // OAuth tokens are stored server-side; never return them to the browser.
    return res.json({ ok: true })
  }catch(err){
    console.error('getTokenFromCode error', err)
    return res.status(500).json({ error: 'token_exchange_failed', message: err.message || String(err) })
  }
})

// Callback endpoint for OAuth2 redirect (useful if you register redirect URI to this server)
router.get('/callback', async (req, res) => {
  const code = req.query && req.query.code
  if(!code) return res.status(400).send('missing_code')
  try{
    await driveService.getTokenFromCode(code)
    // Redirect to a simple success page or return JSON
    return res.send('Google Drive authorization successful. You can close this window.')
  }catch(err){
    console.error('callback token exchange failed', err)
    return res.status(500).send('token_exchange_failed')
  }
})

// Status: whether tokens are present
router.get('/status', requireAuth, requireRole('Evaluador', 'Responsable SGC'), async (req, res) => {
  try{
    const ok = await driveService.hasSavedToken()
    return res.json({ authorized: ok })
  }catch(err){
    return res.status(500).json({ error: 'status_error' })
  }
})

module.exports = router
