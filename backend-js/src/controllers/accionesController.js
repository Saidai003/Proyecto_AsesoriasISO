const { pool } = require('../db')

const ALLOWED = ['Pendiente','En_Progreso','Eficaz','No_Eficaz']

async function updateAction(req, res){
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    const user = req.user
    const payload = req.body || {}
    if(!payload || typeof payload.estado_accion === 'undefined') return res.status(400).json({ error: 'estado_accion required' })
    const newState = String(payload.estado_accion)
    if(!ALLOWED.includes(newState)) return res.status(400).json({ error: 'invalid_state' })

    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id = ?', [id])
    if(!rows || rows.length===0) return res.status(404).json({ error: 'not_found' })
    const action = rows[0]
    const prev = action.estado_accion

    await pool.execute('UPDATE ACCIONES_CORRECTIVAS SET estado_accion = ?, fecha_accion = NOW() WHERE id = ?', [newState, id])

    // insert history
    try{
      await pool.execute('INSERT INTO ACCIONES_CORRECTIVAS_HIST (accion_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_snapshot) VALUES (?, ?, ?, ?, ?, NOW())', [id, prev, newState, user.id || null, payload.comentario || null])
    }catch(e){ console.error('insert accion hist error', e) }

    // notify responsables of NC if any
    try{
      const [resps] = await pool.execute('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [action.auditoria_nc_id])
      const msg = `Acción correctiva #${id} actualizada: ${prev} -> ${newState}`
      for(const r of (resps||[])){
        await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [r.usuario_id, 'ACCION_UPDATED', msg, `/nc/${action.auditoria_nc_id}`])
      }
    }catch(e){ console.error('notify responsables on action update error', e) }

    const [updated] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id = ?', [id])
    return res.json(updated[0])
  }catch(err){ console.error('updateAction error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function getActionHistory(req, res){
  try{
    const q = req.query.q || ''
    const estado = req.query.estado || ''
    const from = req.query.from || ''
    const to = req.query.to || ''
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize) || 50))
    const where = []
    const params = []
    // what does where.push do?
    // it adds a new condition to the where array, which will later be joined with 
    // ' AND ' to form the WHERE clause of the SQL query. The params array 
    // collects the corresponding values for the placeholders in the SQL query. 
    // For example, if q is provided, it adds a condition to search for q 
    // in either the accion or contenido_comentario fields, and adds the 
    // corresponding parameters with wildcards for the LIKE operator.
    
    // What is the LIKE operator?
    // The LIKE operator in SQL is used to search for a specified pattern in a column. 
    // It is often used with wildcard characters:
    // - % represents zero or more characters
    // - _ represents a single character

    // In conclusion, here we are building a dynamic SQL query based on
    // the provided filters (q, estado, from, to, accion_id, nc) 
    // and collecting the parameters for those filters in the params array.
    // By using parameterized queries, this allows us to execute a 
    // parameterized query that is safe from SQL injection and can 
    // handle various combinations of filters.
    if(q){ where.push('(a.accion LIKE ? OR a.contenido_comentario LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
    if(estado){ where.push('h.estado_nuevo = ?'); params.push(estado) }
    if(from){ where.push('h.fecha_snapshot >= ?'); params.push(from) }
    if(to){ where.push('h.fecha_snapshot <= ?'); params.push(to) }
    // allow filtering by accion_id or auditoria_nc_id (nc)
    if(req.query.accion_id){ where.push('h.accion_id = ?'); params.push(Number(req.query.accion_id)) }
    if(req.query.nc){ where.push('a.auditoria_nc_id = ?'); params.push(Number(req.query.nc)) }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : ''
    const offset = (page-1)*pageSize
    // Use direct numeric injection for LIMIT/OFFSET after sanitizing to avoid
    // driver/server prepared-statement issues with LIMIT placeholders.
    const safePageSize = Number(pageSize) || 50
    const safeOffset = Number(offset) || 0
    const sql = `SELECT h.id, h.accion_id, h.estado_anterior, h.estado_nuevo, h.usuario_id, u.nombre as usuario_nombre, h.comentario, h.fecha_snapshot, a.accion, a.nc FROM ACCIONES_CORRECTIVAS_HIST h JOIN ACCIONES_CORRECTIVAS a ON a.id = h.accion_id LEFT JOIN USUARIOS u ON u.id = h.usuario_id ${whereSql} ORDER BY h.fecha_snapshot DESC LIMIT ${safePageSize} OFFSET ${safeOffset}`
    const allParams = params
    console.log('getActionHistory sql:', sql)
    console.log('getActionHistory params length:', allParams.length, 'params:', allParams)
    const [rows] = await pool.execute(sql, allParams)
    return res.json({ page, pageSize, items: rows })
  }catch(err){ console.error('getActionHistory error', err); return res.status(500).json({ error: 'internal_error' }) }
}

module.exports = { updateAction, getActionHistory }

async function getAccionesByEvaluacion(req, res){
  try{
    const evalId = Number(req.params.id)
    if(!evalId) return res.status(400).json({ error: 'invalid_evaluacion_id' })
    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id IN (SELECT id FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?)', [evalId])
    return res.json(rows)
  }catch(e){ console.error('getAccionesByEvaluacion error', e); return res.status(500).json({ error: 'internal' }) }
}

module.exports.getAccionesByEvaluacion = getAccionesByEvaluacion
