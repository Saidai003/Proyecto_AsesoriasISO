const { pool } = require('../db')
const { broadcast } = require('../services/ws')
const { sendEvent } = require('../services/sse')
const { verifyWorkspaceAccess } = require('../lib/workspaceAuth')

async function getMessages(req, res) {
  try {
    const ncId = req.query.nc_id ? Number(req.query.nc_id) : null
    const reqId = req.query.requisito_id ? Number(req.query.requisito_id) : null
    const limit = Math.min(1000, Number(req.query.limit || 200))
    const user = req.user
    const workspaceId = user?.workspace_id || null

    // A chat request must be scoped to exactly one protected resource. Without
    // this guard the query below would return messages from every room, and we don't want that! Yet...
    if ((!ncId && !reqId) || (ncId && reqId)) {
      return res.status(400).json({ error: 'nc_id_or_requisito_id_required' })
    }

    if (ncId && workspaceId) {
      const access = await verifyWorkspaceAccess(ncId, 'nc', workspaceId)
      if (!access) return res.status(403).json({ error: 'forbidden' })
    } else if (reqId && workspaceId) {
      const access = await verifyWorkspaceAccess(reqId, 'evaluacion', workspaceId)
      if (!access) return res.status(403).json({ error: 'forbidden' })
    }

    let sql = 'SELECT * FROM CHAT_MESSAGES '
    const params = []
    if (ncId) { sql += 'WHERE nc_id = ? '; params.push(ncId) }
    else if (reqId) { sql += 'WHERE requisito_id = ? '; params.push(reqId) }
    sql += 'ORDER BY created_at ASC '
    sql += `LIMIT ${Number(limit)}`
    const [rows] = await pool.execute(sql, params)
    const formattedRows = rows.map(row => {
      if (row.metadata && typeof row.metadata === 'string') {
        try {
          row.metadata = JSON.parse(row.metadata)
        } catch (_) { }
      }
      return row
    })
    res.json(formattedRows)
  } catch (e) { console.error('getMessages error', e); res.status(500).json({ error: 'internal' }) }
}

async function postMessage(req, res) {
  try {
    const user = req.user
    if (!user || !user.id) return res.status(401).json({ error: 'unauthorized' })

    const { requisito_id, nc_id, accion_id, evidencia_id, contenido, referencia_type, referencia_id, metadata } = req.body || {}
    if (!contenido || (!nc_id && !requisito_id)) return res.status(400).json({ error: 'missing_fields' })

    const workspaceId = user.workspace_id || null

    if (nc_id && workspaceId) {
      const access = await verifyWorkspaceAccess(nc_id, 'nc', workspaceId)
      if (!access) return res.status(403).json({ error: 'forbidden' })
    } else if (requisito_id && workspaceId) {
      const access = await verifyWorkspaceAccess(requisito_id, 'evaluacion', workspaceId)
      if (!access) return res.status(403).json({ error: 'forbidden' })
    }

    let autor_nombre = null, autor_rol = null, autor_id = user.id
    try {
      const [rows] = await pool.execute('SELECT nombre, role_id FROM USUARIOS WHERE id = ?', [user.id])
      if (rows && rows[0]) {
        autor_nombre = rows[0].nombre || null
        if (rows[0].role_id) {
          const [r] = await pool.execute('SELECT nombre FROM ROLES WHERE id = ?', [rows[0].role_id])
          if (r && r[0] && r[0].nombre) autor_rol = r[0].nombre
        }
      }
    } catch (e) { console.error('resolve author name error', e) }

    const meta = metadata && typeof metadata === 'object' ? { ...metadata } : (metadata ? JSON.parse(metadata) : {})
    meta.author = { id: autor_id, nombre: autor_nombre || null, rol: autor_rol || null }

    const [result] = await pool.execute(`INSERT INTO CHAT_MESSAGES (requisito_id, nc_id, accion_id, evidencia_id, autor_id, contenido, referencia_type, referencia_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [requisito_id || null, nc_id || null, accion_id || null, evidencia_id || null, autor_id, contenido, referencia_type || null, referencia_id || null, Object.keys(meta).length ? JSON.stringify(meta) : null])
    const insertedId = result.insertId
    const [rows] = await pool.execute('SELECT * FROM CHAT_MESSAGES WHERE id = ?', [insertedId])
    const msg = rows && rows[0] ? rows[0] : null
    if (msg && msg.metadata && typeof msg.metadata === 'string') {
      try {
        msg.metadata = JSON.parse(msg.metadata)
      } catch (_) { }
    }
    // broadcast to WebSocket clients and keep SSE compatibility for tests/legacy flows
    try { broadcast('chat:new', msg) } catch (e) { console.error('ws broadcast error', e) }
    try { sendEvent('chat:new', msg) } catch (e) { console.error('sse broadcast error', e) }
    res.status(201).json(msg)
  } catch (e) { console.error('postMessage error', e); res.status(500).json({ error: 'internal' }) }
}

module.exports = { getMessages, postMessage }
