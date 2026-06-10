// WebSocket broadcaster with room support (replaces SSE)
const WebSocket = require('ws')
const url = require('url')
const { verifyAccessToken } = require('../auth')

// roomKey -> Set of client objects
const rooms = new Map()

let wss = null

/**
 * Initialise the WebSocket server and attach it to an existing HTTP server.
 * Must be called once during startup (see index.js).
 */
function init(server) {
  wss = new WebSocket.Server({ noServer: true })

  // Handle the HTTP -> WS upgrade on the /ws path
  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname
    if (pathname !== '/ws') {
      socket.destroy()
      return
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  })

  wss.on('connection', (ws, req) => {
    const query = url.parse(req.url, true).query || {}

    // Optional JWT authentication via ?token=...
    let user = null
    if (query.token) {
      try { user = verifyAccessToken(query.token) } catch (_) { }
    }

    const client = {
      id: Date.now() + Math.random(),
      ws,
      user,
      rooms: new Set()
    }

    // Subscribe to rooms based on query params
    let hasRoom = false
    if (query.requisito_id) {
      const key = `requisito:${Number(query.requisito_id)}`
      addToRoom(key, client)
      hasRoom = true
    }
    if (query.nc_id) {
      const key = `nc:${Number(query.nc_id)}`
      addToRoom(key, client)
      hasRoom = true
    }
    // Global fallback
    if (!hasRoom) {
      addToRoom('global', client)
    }

    ws.on('close', () => {
      removeClient(client)
    })
    ws.on('error', () => {
      removeClient(client)
    })
  })
}

// ── Room helpers ────────────────────────────────────────────────────

function addToRoom(roomKey, client) {
  if (!rooms.has(roomKey)) rooms.set(roomKey, new Set())
  rooms.get(roomKey).add(client)
  client.rooms.add(roomKey)
}

function removeClient(client) {
  if (client.rooms) {
    for (const roomKey of client.rooms) {
      const set = rooms.get(roomKey)
      if (set) {
        set.delete(client)
        if (set.size === 0) rooms.delete(roomKey)
      }
    }
  }
}

// ── Broadcasting ────────────────────────────────────────────────────

/**
 * Broadcast an event to the appropriate rooms.
 * @param {string} name  – event name, e.g. "chat:new", "notification:new"
 * @param {object} data  – payload object (will be JSON-stringified)
 */
function broadcast(name, data) {
  const target = new Set()

  if (data) {
    if (data.requisito_id) {
      const key = `requisito:${data.requisito_id}`
      const set = rooms.get(key)
      if (set) for (const c of set) target.add(c)
    }
    if (data.nc_id) {
      const key = `nc:${data.nc_id}`
      const set = rooms.get(key)
      if (set) for (const c of set) target.add(c)
    }
  }
  // Global clients always receive every event
  const globalClients = rooms.get('global')
  if (globalClients) {
    for (const c of globalClients) target.add(c)
  }

  const msg = JSON.stringify({ event: name, data })

  for (const c of target) {
    try {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(msg)
      } else {
        removeClient(c)
      }
    } catch (_) {
      removeClient(c)
    }
  }
}

module.exports = { init, broadcast }
