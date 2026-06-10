// Simple in-memory SSE broadcaster with room support
const rooms = new Map() // roomKey -> Set of client objects

function removeClient(client) {
  if (client.rooms) {
    for (const roomKey of client.rooms) {
      const roomClients = rooms.get(roomKey)
      if (roomClients) {
        roomClients.delete(client)
        if (roomClients.size === 0) {
          rooms.delete(roomKey)
        }
      }
    }
  }
}

function sendEvent(name, data) {
  const payload = `event: ${name}\n` + `data: ${JSON.stringify(data)}\n\n`

  // Identify the target clients for the event
  const targetClients = new Set()

  if (data) {
    if (data.requisito_id) {
      const roomKey = `requisito:${data.requisito_id}`
      const roomClients = rooms.get(roomKey)
      if (roomClients) {
        for (const c of roomClients) targetClients.add(c)
      }
    }
    if (data.nc_id) {
      const roomKey = `nc:${data.nc_id}`
      const roomClients = rooms.get(roomKey)
      if (roomClients) {
        for (const c of roomClients) targetClients.add(c)
      }
    }
  }

  // Also send to global/unsegmented clients (connected without rooms)
  const globalClients = rooms.get('global')
  if (globalClients) {
    for (const c of globalClients) targetClients.add(c)
  }

  // Broadcast to target clients
  for (const c of Array.from(targetClients)) {
    try {
      c.res.write(payload)
    } catch (e) {
      removeClient(c)
    }
  }
}

function addClient(req, res, user) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.write('\n')

  const client = {
    id: Date.now() + Math.random(),
    res,
    user,
    rooms: new Set()
  }

  // Parse room subscriptions from query parameters
  const reqId = req.query && req.query.requisito_id ? Number(req.query.requisito_id) : null
  const ncId = req.query && req.query.nc_id ? Number(req.query.nc_id) : null

  // A set is a collection of unique values,
  // which in this case the new Set() is a new set of clients for each room.
  // This means if a requirement is updated, only the users 
  // who are in the room for that requirement will receive the update.
  let hasRoom = false
  if (reqId) {
    const roomKey = `requisito:${reqId}`
    if (!rooms.has(roomKey)) rooms.set(roomKey, new Set()) // Creates a new set if it doesn't exist
    rooms.get(roomKey).add(client) // Adds the client to the room
    client.rooms.add(roomKey) // Adds the room to the client
    hasRoom = true
  }
  if (ncId) {
    const roomKey = `nc:${ncId}`
    if (!rooms.has(roomKey)) rooms.set(roomKey, new Set())
    rooms.get(roomKey).add(client)
    client.rooms.add(roomKey)
    hasRoom = true
  }

  // If no specific room is requested, register as global
  if (!hasRoom) {
    const roomKey = 'global'
    if (!rooms.has(roomKey)) rooms.set(roomKey, new Set())
    rooms.get(roomKey).add(client)
    client.rooms.add(roomKey)
  }

  // Clean up on connection close
  res.on('close', () => {
    removeClient(client)
  })

  return client
}

module.exports = { addClient, sendEvent };
