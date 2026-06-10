const { pool } = require('../db')

const ALLOWED = ['Pendiente','En_Progreso','Eficaz','No_Eficaz']

async function updateAction(req, res){
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    const user = req.user
    const payload = req.body || {}

    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id = ?', [id])
    if(!rows || rows.length===0) return res.status(404).json({ error: 'not_found' })
    const action = rows[0]

    // If request contains only general editable fields, update them
    const editableFields = ['accion','contenido_comentario','acciones_futuras_propuestas','requiere_nueva_nc']
    const updates = []
    const params = []
    const changeDetails = []
    for(const f of editableFields){
      if(Object.prototype.hasOwnProperty.call(payload, f)){
        const newValue = f === 'requiere_nueva_nc' ? (payload[f] ? 1 : 0) : payload[f]
        const oldValue = action[f]
        const same = String(oldValue) === String(newValue)
        updates.push(`${f} = ?`)
        params.push(newValue)
        if(!same){
          changeDetails.push(`${f}: "${oldValue === null || oldValue === undefined ? '' : oldValue}" → "${newValue === null || newValue === undefined ? '' : newValue}"`)
        }
      }
    }

    // Handle state change separately (keeps previous behavior)
    if(Object.prototype.hasOwnProperty.call(payload, 'estado_accion')){
      const newState = String(payload.estado_accion)
      if(!ALLOWED.includes(newState)) return res.status(400).json({ error: 'invalid_state' })
      const prev = action.estado_accion
      // update state and timestamp
      updates.push('estado_accion = ?')
      params.push(newState)
      updates.push('fecha_accion = NOW()')

      // insert history with optional comentario
      try{
        await pool.execute('INSERT INTO ACCIONES_CORRECTIVAS_HIST (accion_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_snapshot) VALUES (?, ?, ?, ?, ?, NOW())', [id, prev, newState, user.id || null, payload.comentario || null])
      }catch(e){ console.error('insert accion hist error', e) }

      // if comentario provided, also reflect it on the main action record so it appears on the card
      if(payload.comentario && String(payload.comentario).trim() !== ''){
        // ensure we overwrite contenido_comentario unless the payload also included it explicitly
        if(!Object.prototype.hasOwnProperty.call(payload, 'contenido_comentario')){
          updates.push('contenido_comentario = ?')
          params.push(payload.comentario)
        }
      }

      // notify responsables of NC if any
      try{
        const [resps] = await pool.execute('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [action.auditoria_nc_id])
        const msg = `Acción correctiva #${id} actualizada: ${prev} -> ${newState}`
        for(const r of (resps||[])){
          await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [r.usuario_id, 'ACCION_UPDATED', msg, `/nc/${action.auditoria_nc_id}`])
        }
      }catch(e){ console.error('notify responsables on action update error', e) }
    }

    // If we have updates to apply, run the UPDATE
    if(updates.length){
      const sql = `UPDATE ACCIONES_CORRECTIVAS SET ${updates.join(', ')} WHERE id = ?`
      const sqlParams = [ ...params, id ]
      try{
        await pool.execute(sql, sqlParams)
      }catch(e){ console.error('update accion execute error', e, sql, sqlParams) }
    }

    if(changeDetails.length){
      try{
        await pool.execute('INSERT INTO ACCIONES_CORRECTIVAS_HIST (accion_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_snapshot) VALUES (?, ?, ?, ?, ?, NOW())', [id, null, null, user.id || null, `Campos modificados: ${changeDetails.join('; ')}`])
      }catch(e){ console.error('insert accion field-change hist error', e) }
    }

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

async function deleteAction(req, res){
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    const user = req.user
    const workspaceId = user?.workspace_id || null

    const [rows] = await pool.execute(
      `SELECT ac.* FROM ACCIONES_CORRECTIVAS ac
       JOIN AUDITORIA_NC a ON ac.auditoria_nc_id = a.id
       JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
       WHERE ac.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    )
    if(!rows || !rows.length) return res.status(404).json({ error: 'not_found' })
    
    // rows would look like this:
    // [
    //   {
    //     id: 1,
    //     auditoria_nc_id: 1,
    //     accion_previa_id: 1,
    //     autor_id: 1,
    //     tipo_autor: 'Evaluador',
    //     nc: 'NC #1',
    //     accion: 'Acción 1',
    //     contenido_comentario: 'Comentario 1',
    //     estado_accion: 'Pendiente',
    //     acciones_futuras_propuestas: 'Acciones futuras 1',
    //     requiere_nueva_nc: 0,
    //     fecha_accion: '2026-01-01 12:00:00'
    //   }
    // ]
    // and so on...
    // and since there is just one row, we can access the data like this:

    const ncId = rows[0].auditoria_nc_id
    const [allRows] = await pool.execute(
      'SELECT id, accion_previa_id FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id = ?',
      [ncId]
    )
    const toDelete = [id]
    for(let i = 0; i < toDelete.length; i++){
      const cur = toDelete[i]
      for(const a of (allRows || [])){
        if(Number(a.accion_previa_id) === Number(cur) && !toDelete.includes(a.id)) toDelete.push(a.id)
      }
    }
    // Borrar hijos antes que padres. Usamos [...toDelete] (spread) para clonar
    // antes de .reverse(): los arreglos se pasan por referencia y reverse()
    // muta in-place; sin copia, toDelete quedaría invertido también.
    // Ver Aprendizaje.md → «Clonación superficial antes de reverse()».
    const ordered = [...toDelete].reverse()
    for(const actionId of ordered){
      await pool.execute('DELETE FROM ACCIONES_CORRECTIVAS WHERE id = ?', [actionId])
    }
    return res.json({ ok: true, deletedIds: toDelete })
  }catch(err){
    console.error('deleteAction error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

module.exports = { updateAction, getActionHistory, deleteAction }

async function getAccionesByEvaluacion(req, res){
  try{
    const evalId = Number(req.params.id)
    if(!evalId) return res.status(400).json({ error: 'invalid_evaluacion_id' })
    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id IN (SELECT id FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?)', [evalId])
    return res.json(rows)
  }catch(e){ console.error('getAccionesByEvaluacion error', e); return res.status(500).json({ error: 'internal' }) }
}

module.exports.getAccionesByEvaluacion = getAccionesByEvaluacion
