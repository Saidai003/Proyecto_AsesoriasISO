const { pool } = require('../db')
const { broadcast } = require('../services/ws')
const { verifyAccessToken } = require('../auth')

async function getMessages(req, res) {
  try {
    const ncId = req.query.nc_id ? Number(req.query.nc_id) : null
    const reqId = req.query.requisito_id ? Number(req.query.requisito_id) : null
    const limit = Math.min(1000, Number(req.query.limit || 200)) // limite de mensajes a obtener
    let sql = 'SELECT * FROM CHAT_MESSAGES '
    const params = []
    if (ncId) { sql += 'WHERE nc_id = ? '; params.push(ncId) }
    else if (reqId) { sql += 'WHERE requisito_id = ? '; params.push(reqId) }
    sql += 'ORDER BY created_at ASC '
    // some MySQL servers/drivers don't accept a parameter placeholder for LIMIT
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
    const token = req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : (req.query && req.query.token)
    let user = null
    if (token) { try { user = verifyAccessToken(token) } catch (e) { /* ignore */ } }

    const { requisito_id, nc_id, accion_id, evidencia_id, contenido, referencia_type, referencia_id, metadata } = req.body || {}
    if (!contenido || (!nc_id && !requisito_id)) return res.status(400).json({ error: 'missing_fields' })

    // resolve author name and role (role may be present in token payload)
    let autor_nombre = null, autor_rol = null, autor_id = null
    if (user && user.id) {
      autor_id = user.id
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
    }

    // merge author info into metadata to avoid depending on schema changes
    const meta = metadata && typeof metadata === 'object' ? { ...metadata } : (metadata ? JSON.parse(metadata) : {})
    if (autor_id || autor_nombre || autor_rol) {
      meta.author = { id: autor_id || null, nombre: autor_nombre || null, rol: autor_rol || null }
    }

    const [result] = await pool.execute(`INSERT INTO CHAT_MESSAGES (requisito_id, nc_id, accion_id, evidencia_id, autor_id, contenido, referencia_type, referencia_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [requisito_id || null, nc_id || null, accion_id || null, evidencia_id || null, autor_id || null, contenido, referencia_type || null, referencia_id || null, Object.keys(meta).length ? JSON.stringify(meta) : null])
    const insertedId = result.insertId
    const [rows] = await pool.execute('SELECT * FROM CHAT_MESSAGES WHERE id = ?', [insertedId])
    const msg = rows && rows[0] ? rows[0] : null
    if (msg && msg.metadata && typeof msg.metadata === 'string') {
      try {
        msg.metadata = JSON.parse(msg.metadata)
      } catch (_) { }
    }
    // broadcast to WebSocket clients
    try { broadcast('chat:new', msg) } catch (e) { console.error('ws broadcast error', e) }
    res.status(201).json(msg)
  } catch (e) { console.error('postMessage error', e); res.status(500).json({ error: 'internal' }) }
}

module.exports = { getMessages, postMessage }
