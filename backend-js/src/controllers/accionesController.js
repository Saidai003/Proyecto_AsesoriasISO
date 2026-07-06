const { pool } = require('../db')
const { verifyWorkspaceAccess } = require('../lib/workspaceAuth')

const ALLOWED = ['Pendiente','En_Progreso','Eficaz','No_Eficaz']

async function updateAction(req, res) {
  try {
    // 1. VALIDACIONES INICIALES Y CAPTURA DE DATOS
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'id required' })
    const user = req.user
    const workspaceId = user?.workspace_id || null

    // 2. PROTECCIÓN IDOR: Verificar propiedad y obtener datos de la acción
    const rowsResult = await pool.execute(
      `SELECT ac.* FROM ACCIONES_CORRECTIVAS ac
       JOIN AUDITORIA_NC anc ON ac.auditoria_nc_id = anc.id
       JOIN EVALUACION_REQUISITO er ON anc.evaluacion_requisito_id = er.id
       WHERE ac.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    )
    const rows = Array.isArray(rowsResult?.[0]) ? rowsResult[0] : []
    if (!rows || !rows.length) return res.status(404).json({ error: 'not_found' })
    const action = rows[0]

    const payload = req.body || {}
    const updates = []
    const params = []
    const changeDetails = []
    let hasNonStateChange = false

    // 3. PROCESAMIENTO EXPLÍCITO DE CAMPOS
    if (payload.accion !== undefined) {
      updates.push('accion = ?')
      params.push(payload.accion)
      hasNonStateChange = true
      if (String(action.accion) !== String(payload.accion)) {
        changeDetails.push(`accion: "${action.accion || ''}" → "${payload.accion || ''}"`)
      }
    }

    if (payload.contenido_comentario !== undefined) {
      updates.push('contenido_comentario = ?')
      params.push(payload.contenido_comentario)
      hasNonStateChange = true
      if (String(action.contenido_comentario) !== String(payload.contenido_comentario)) {
        changeDetails.push(`contenido_comentario: "${action.contenido_comentario || ''}" → "${payload.contenido_comentario || ''}"`)
      }
    }

    if (payload.acciones_futuras_propuestas !== undefined) {
      updates.push('acciones_futuras_propuestas = ?')
      params.push(payload.acciones_futuras_propuestas)
      hasNonStateChange = true
      if (String(action.acciones_futuras_propuestas) !== String(payload.acciones_futuras_propuestas)) {
        changeDetails.push(`acciones_futuras_propuestas: "${action.acciones_futuras_propuestas || ''}" → "${payload.acciones_futuras_propuestas || ''}"`)
      }
    }

    if (payload.requiere_nueva_nc !== undefined) {
      const newValueBinary = payload.requiere_nueva_nc ? 1 : 0
      updates.push('requiere_nueva_nc = ?')
      params.push(newValueBinary)
      hasNonStateChange = true
      if (String(action.requiere_nueva_nc) !== String(newValueBinary)) {
        changeDetails.push(`requiere_nueva_nc: "${action.requiere_nueva_nc || 0}" → "${newValueBinary}"`)
      }
    }

    if (payload.comentario && String(payload.comentario).trim() !== '') {
        if (payload.contenido_comentario === undefined) {
          updates.push('contenido_comentario = ?')
          params.push(payload.comentario)
        }
    }

    // 4. GESTIÓN DEL CAMBIO DE ESTADO
    if (payload.estado_accion !== undefined) {
      const newState = String(payload.estado_accion)
      if (!ALLOWED.includes(newState)) return res.status(400).json({ error: 'invalid_state' })
      const prevState = action.estado_accion

      updates.push('estado_accion = ?')
      params.push(newState)
      updates.push('fecha_accion = NOW()')
      
      // Solo registrar cambio de estado si realmente cambió
      if (String(prevState) !== newState) {
        changeDetails.push(`estado_accion: "${prevState || ''}" → "${newState}"`)
        
        try {
          await pool.execute(
            `INSERT INTO ACCIONES_CORRECTIVAS_HIST (accion_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_snapshot) VALUES (?, ?, ?, ?, ?, NOW())`,
            [id, prevState, newState, user.id || null, payload.comentario || null]
          )
        } catch (e) { console.error('insert accion hist error', e) }

        try {
          const respsResult = await pool.execute('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [action.auditoria_nc_id])
          const resps = Array.isArray(respsResult?.[0]) ? respsResult[0] : []
          const msg = `Acción correctiva #${id} actualizada: ${prevState} -> ${newState}`
          for (const r of (resps || [])) {
            await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [r.usuario_id, 'ACCION_UPDATED', msg, `/nc/${action.auditoria_nc_id}`])
          }
        } catch (e) { console.error('notify responsables error', e) }
      }
    }

    // 5. EJECUCIÓN DE LA ACTUALIZACIÓN EN BASE DE DATOS
    if (updates.length > 0) {
      const sql = `UPDATE ACCIONES_CORRECTIVAS SET ${updates.join(', ')} WHERE id = ?`
      const sqlParams = [...params, id]
      try {
        await pool.execute(sql, sqlParams)
      } catch (e) { console.error('update accion execute error', e) }
    }

    if (hasNonStateChange && changeDetails.length > 0) {
      try {
        const textoHistorial = `Campos modificados: ${changeDetails.join('; ')}`
        await pool.execute(
          `INSERT INTO ACCIONES_CORRECTIVAS_HIST (accion_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_snapshot) VALUES (?, ?, ?, ?, ?, NOW())`,
          [id, null, null, user.id || null, textoHistorial]
        )
      } catch (e) { console.error('insert field-change hist error', e) }
    }

    // 6. RETORNAR EL REGISTRO ACTUALIZADO AL CLIENTE
    const updatedResult = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id = ?', [id])
    const updated = Array.isArray(updatedResult?.[0]) ? updatedResult[0] : []
    return res.json(updated[0])
  } catch (err) {
    console.error('updateAction error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

async function getActionHistory(req, res){
  try{
    // 1. CAPTURA DE PARÁMETROS
    const user = req.user
    const workspaceId = user?.workspace_id || null
    const q = req.query.q || ''
    const estado = req.query.estado || ''
    const from = req.query.from || ''
    const to = req.query.to || ''
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize) || 50))

    // 2. CONSTRUCCIÓN DEL WHERE DINÁMICO
    const where = []
    const params = []
    
    // Filtro multi-tenancy: solo historial de acciones del workspace del usuario
    if (workspaceId) {
      where.push('er.workspace_id = ?')
      params.push(workspaceId)
    }
    
    if(q){ where.push('(a.accion LIKE ? OR a.contenido_comentario LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
    if(estado){ where.push('h.estado_nuevo = ?'); params.push(estado) }
    if(from){ where.push('h.fecha_snapshot >= ?'); params.push(from) }
    if(to){ where.push('h.fecha_snapshot <= ?'); params.push(to) }
    if(req.query.accion_id){ where.push('h.accion_id = ?'); params.push(Number(req.query.accion_id)) }
    if(req.query.nc){ where.push('a.auditoria_nc_id = ?'); params.push(Number(req.query.nc)) }

    // 3. EJECUCIÓN CON PAGINACIÓN
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : ''
    const offset = (page-1)*pageSize
    const safePageSize = Number(pageSize) || 50
    const safeOffset = Number(offset) || 0
    const sql = `SELECT h.id, h.accion_id, h.estado_anterior, h.estado_nuevo, h.usuario_id, u.nombre as usuario_nombre, h.comentario, h.fecha_snapshot, a.accion, a.nc FROM ACCIONES_CORRECTIVAS_HIST h JOIN ACCIONES_CORRECTIVAS a ON a.id = h.accion_id JOIN AUDITORIA_NC anc ON a.auditoria_nc_id = anc.id JOIN EVALUACION_REQUISITO er ON anc.evaluacion_requisito_id = er.id LEFT JOIN USUARIOS u ON u.id = h.usuario_id ${whereSql} ORDER BY h.fecha_snapshot DESC LIMIT ${safePageSize} OFFSET ${safeOffset}`
    const allParams = params
    console.log('getActionHistory sql:', sql)
    console.log('getActionHistory params length:', allParams.length, 'params:', allParams)
    const [rows] = await pool.execute(sql, allParams)
    return res.json({ page, pageSize, items: rows })
  }catch(err){ console.error('getActionHistory error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function deleteAction(req, res){
  try{
    // 1. VALIDACIÓN INICIAL
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    const user = req.user
    const workspaceId = user?.workspace_id || null

    // 2. PROTECCIÓN IDOR: Verificar propiedad y obtener datos de la acción
    const [rows] = await pool.execute(
      `SELECT ac.* FROM ACCIONES_CORRECTIVAS ac
       JOIN AUDITORIA_NC a ON ac.auditoria_nc_id = a.id
       JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
       WHERE ac.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    )
    if (!rows || !rows.length) return res.status(404).json({ error: 'not_found' })

    // 3. BUSCAR ACCIONES HIJAS RECURSIVAMENTE
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

    // 4. Borrar hijos antes que padres (Ver docs/aprendizajes/05-clonacion-superficial-reverse.md)
    const ordered = [...toDelete].reverse()
    for(const actionId of ordered){
      await pool.execute('DELETE FROM ACCIONES_CORRECTIVAS WHERE id = ?', [actionId])
    }

    // 5. RESPUESTA
    return res.json({ ok: true, deletedIds: toDelete })
  }catch(err){
    console.error('deleteAction error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

async function getAccionesByEvaluacion(req, res){
  try{
    const evalId = Number(req.params.id)
    if(!evalId) return res.status(400).json({ error: 'invalid_evaluacion_id' })
    const user = req.user
    const workspaceId = user?.workspace_id || null

    const access = await verifyWorkspaceAccess(evalId, 'evaluacion', workspaceId)
    if (!access) return res.status(403).json({ error: 'forbidden' })

    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id IN (SELECT id FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?)', [evalId])
    return res.json(rows)
  }catch(e){ console.error('getAccionesByEvaluacion error', e); return res.status(500).json({ error: 'internal' }) }
}

async function createAction(req, res){
  try{
    const id = Number(req.params.id)
    const user = req.user
    const workspaceId = user?.workspace_id || null
    if(!id) return res.status(400).json({ error: 'id required' })

    const [check] = await pool.execute(
      `SELECT a.id FROM AUDITORIA_NC a JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id WHERE a.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    )
    if (!check || check.length === 0) return res.status(404).json({ error: 'not_found' })

    const payload = req.body || {}

    if (!payload.accion || !String(payload.accion).trim()) {
      return res.status(400).json({ error: 'accion_required' })
    }

    const accion_previa_id = payload.accion_previa_id || null
    const accion = payload.accion
    const contenido_comentario = payload.contenido_comentario || ''
    const estado_accion = payload.estado_accion || 'Pendiente'
    const acciones_futuras_propuestas = payload.acciones_futuras_propuestas || ''
    const requiere_nueva_nc = payload.requiere_nueva_nc ? 1 : 0

    const [result] = await pool.execute('INSERT INTO ACCIONES_CORRECTIVAS (auditoria_nc_id, accion_previa_id, autor_id, tipo_autor, nc, accion, contenido_comentario, estado_accion, acciones_futuras_propuestas, requiere_nueva_nc, fecha_accion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [id, accion_previa_id, user.id, user.role || 'Responsable SGC', `NC #${id}`, accion, contenido_comentario, estado_accion, acciones_futuras_propuestas, requiere_nueva_nc])
    const insertId = result.insertId

    try{
      await pool.execute('INSERT INTO ACCIONES_CORRECTIVAS_HIST (accion_id, estado_anterior, estado_nuevo, usuario_id, comentario, fecha_snapshot) VALUES (?, ?, ?, ?, ?, NOW())', [insertId, null, estado_accion, user.id || null, contenido_comentario || null])
    }catch(e){ console.error('insert accion hist error on create', e) }

    try{
      const [resps] = await pool.execute('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [id])
      const msg = `Nueva acción correctiva para NC #${id}: ${accion}`
      for(const r of (resps||[])){
        await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [r.usuario_id, 'ACCION_NC', msg, `/nc/${id}`])
      }
      try{
        const [ncRows] = await pool.execute('SELECT evaluador_id FROM AUDITORIA_NC WHERE id = ?', [id])
        if(ncRows && ncRows.length && ncRows[0].evaluador_id){
          const evalId = ncRows[0].evaluador_id
          await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [evalId, 'ACCION_NC', msg, `/nc/${id}`])
        }
      }catch(_){ }
    }catch(e){ console.error('notify on action error', e) }

    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id = ?', [insertId])
    return res.status(201).json(rows[0])
  }catch(err){ console.error('createAction error', err); return res.status(500).json({ error: 'internal_error' }) }
}

module.exports = { updateAction, getActionHistory, deleteAction, getAccionesByEvaluacion, createAction }