// WebSocket broadcaster with room support (replaces SSE)
const WebSocket = require('ws')
const url = require('url')
const { verifyAccessToken } = require('../auth')
const { verifyWorkspaceAccess } = require('../lib/workspaceAuth')

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

  wss.on('connection', async (ws, req) => {
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

    // Helper to check workspace access
    const checkAccess = async (resourceId, type) => {
      if (!user) return false
      if (user.role === 'Admin') return true
      if (!user.workspace_id) return false
      return await verifyWorkspaceAccess(resourceId, type, Number(user.workspace_id))
    }

    // Subscribe to rooms based on query params
    let hasRoom = false
    if (query.requisito_id) {
      const reqId = Number(query.requisito_id)
      const allowed = await checkAccess(reqId, 'evaluacion')
      if (!allowed) {
        ws.close(4003, 'Forbidden: Workspace access required')
        return
      }
      const key = `requisito:${reqId}`
      addToRoom(key, client)
      hasRoom = true
    }
    if (query.nc_id) {
      const ncId = Number(query.nc_id)
      const allowed = await checkAccess(ncId, 'nc')
      if (!allowed) {
        ws.close(4003, 'Forbidden: Workspace access required')
        return
      }
      const key = `nc:${ncId}`
      addToRoom(key, client)
      hasRoom = true
    }
    // Global fallback
    if (!hasRoom) {
      // Only allow global subscription if user is Admin
      if (user && user.role === 'Admin') {
        addToRoom('global', client)
      } else {
        ws.close(4003, 'Forbidden: Global channel restricted to admins')
        return
      }
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
