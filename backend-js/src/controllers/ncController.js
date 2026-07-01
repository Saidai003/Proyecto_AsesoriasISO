const { pool } = require('../db');

// create a new NC for a requisito (accept requisito_base_id, responsables[])
async function createNC(req, res){
  try{
    const user = req.user;
    const { requisito_base_id, titulo, descripcion, responsables } = req.body;
    if(!requisito_base_id || !titulo) return res.status(400).json({ error: 'requisito_base_id and titulo required' });

    // find or create evaluacion_requisito for this workspace
    const workspaceId = user.workspace_id || null;
    const [er] = await pool.execute('SELECT id FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?', [requisito_base_id, workspaceId]);
    let evaluacionId;

    if(er && er.length) evaluacionId = er[0].id;
    else{
      const [ins] = await pool.execute('INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, fecha_ultima_edicion) VALUES (?, ?, ?, NOW())', [requisito_base_id, workspaceId, 'NA']);
      evaluacionId = ins.insertId;
    }

    // insert NC
    const [result] = await pool.execute(
      `INSERT INTO AUDITORIA_NC (evaluacion_requisito_id, evaluador_id, estado_flujo, estado_validacion, comentario_nc, titulo, descripcion, ultima_edicion_por, fecha_ultima_edicion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [evaluacionId, user.id, 'Abierta', 'Parcial', descripcion || '', titulo, descripcion || '', user.id]
    );
    const ncId = result.insertId;

    // assign responsables (pivot) and create notifications
    if(Array.isArray(responsables) && responsables.length){
      for(const uid of responsables){
        try{
          // insert pivot row (if table exists)
          await pool.execute('INSERT IGNORE INTO AUDITORIA_NC_RESPONSABLES (auditoria_nc_id, usuario_id) VALUES (?, ?)', [ncId, uid]);
          const msg = `Se le asignó una No Conformidad (#${ncId}): ${titulo}`;
          const link = `/nc/${ncId}`;
          await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link, read_flag, created_at) VALUES (?, ?, ?, ?, 0, NOW())', [uid, 'NC_ASIGNADA', msg, link]);
        }catch(inner){ console.error('assign responsable error', inner); }
      }
    }

    return res.status(201).json({ id: ncId });
  }catch(err){
    console.error('createNC error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function deleteNC(req, res){
  try{
    const id = req.params.id;
    const workspaceId = req.user.workspace_id || null;
    if(!id) return res.status(400).json({ error: 'id required' });

    // Validate Ownership (IDOR Fix)
    const [check] = await pool.execute(
      `SELECT a.id FROM AUDITORIA_NC a JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id WHERE a.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    );
    if (!check || check.length === 0) return res.status(404).json({ error: 'not_found' });

    await pool.execute('DELETE FROM AUDITORIA_NC WHERE id = ?', [id]);
    // clean pivot if exists
    await pool.execute('DELETE FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [id]);
    return res.json({ id });
  }catch(err){
    console.error('deleteNC error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// update NC state or validation
async function updateNC(req, res){
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    const user = req.user
    const workspaceId = user.workspace_id || null;
    const role = user && user.role ? user.role : ''
    const isAdmin = role === 'Admin'
    const payload = req.body || {}

    // Validate Ownership & Fetch NC (IDOR Fix)
    const [rows] = await pool.execute(
      `SELECT a.* FROM AUDITORIA_NC a JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id WHERE a.id = ? AND er.workspace_id = ?`, 
      [id, workspaceId]
    )
    if(!rows || rows.length===0) return res.status(404).json({ error: 'not_found' })
    const nc = rows[0]

    const updates = []
    const params = []

    // validation state change (APPROVAL)
    if(Object.prototype.hasOwnProperty.call(payload, 'estado_validacion')){
      updates.push('estado_validacion = ?'); params.push(payload.estado_validacion)
    }

    // evaluator comment update
    if(Object.prototype.hasOwnProperty.call(payload, 'comentario_nc')){
      if(role !== 'Evaluador' && !isAdmin) {
        return res.status(403).json({ error: 'forbidden' })
      }
      updates.push('comentario_nc = ?'); params.push(payload.comentario_nc)
    }

    // flow state change
    if(Object.prototype.hasOwnProperty.call(payload, 'estado_flujo')){
      let newFlow = payload.estado_flujo
      const current = nc.estado_flujo
      if(newFlow !== current){
        // enforce role rules
        if(role === 'Responsable SGC' || isAdmin){
          if(current !== 'Abierta'){ return res.status(403).json({ error: 'forbidden' }) }
          if(!['Análisis','Ejecución'].includes(newFlow)){ return res.status(400).json({ error: 'invalid_target_state' }) }
        }else if(role === 'Evaluador' || isAdmin){
          if(!['Abierta','Verificación','Cerrada'].includes(newFlow)){ return res.status(400).json({ error: 'invalid_target_state' }) }
        }else{
          return res.status(403).json({ error: 'forbidden' }) }

        try{
          if(typeof newFlow === 'string'){
            const strip = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            const normalized = strip(newFlow).toLowerCase()
            const allowed = ['Abierta','Análisis','Ejecución','Verificación','Cerrada']
            const allowedStripped = allowed.map(a => strip(a).toLowerCase())
            const idx = allowedStripped.indexOf(normalized)
            if(idx !== -1) newFlow = allowed[idx]
          }
        }catch(e){ console.error('normalize flow error', e) }

        if(newFlow === 'Verificación'){
          const fecha = payload.fecha_verificacion_eficacia
          if(!fecha) return res.status(400).json({ error: 'fecha_verificacion_required' })
          const ts = new Date(fecha).getTime()
          if(Number.isNaN(ts)) return res.status(400).json({ error: 'invalid_fecha_verificacion' })
          if(ts <= Date.now()) return res.status(400).json({ error: 'fecha_verificacion_must_be_future' })
          
          updates.push('estado_flujo = ?'); params.push(newFlow)
          const dateOnly = new Date(ts).toISOString().slice(0,10)
          updates.push('fecha_verificacion_eficacia = ?'); params.push(dateOnly)
          
          try{
            const evaluatorId = nc.evaluador_id
            if(evaluatorId){
              const schedSql = 'INSERT INTO SCHEDULED_NOTIFICATIONS (nc_id, usuario_id, trigger_at, created_at, sent_flag) VALUES (?, ?, ?, NOW(), 0)'
              const schedParams = [id, evaluatorId, new Date(ts)]
              await pool.execute(schedSql, schedParams)
            }
          }catch(e){ console.error('schedule notification error', e) }
        } else {
          updates.push('estado_flujo = ?'); params.push(newFlow)
        }
      }
    }

    if(updates.length===0){ return res.status(400).json({ error: 'nothing_to_update' }) }
    params.push(id)
    const sql = `UPDATE AUDITORIA_NC SET ${updates.join(', ')}, ultima_edicion_por = ?, fecha_ultima_edicion = NOW() WHERE id = ?`
    const sqlParams = [ ...(params.slice(0,-1)), user.id, params[params.length-1] ]
    try{
      await pool.execute(sql, sqlParams)
    }catch(ex){
      console.error('updateNC execute error', ex)
      throw ex
    }

    // insert history
    try{
      const historyComentario = Object.prototype.hasOwnProperty.call(payload, 'comentario_nc') ? payload.comentario_nc : null
      const historyFechaVerificacion = payload.fecha_verificacion_eficacia || nc.fecha_verificacion_eficacia || null
      await pool.execute(
        'INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, fecha_verificacion_eficacia, comentario, fecha_snapshot, ultima_edicion_por) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
        [id, payload.estado_flujo || nc.estado_flujo, payload.estado_validacion || nc.estado_validacion, historyFechaVerificacion, historyComentario, user.id]
      )
    }catch(e){ console.error('insert nc hist error', e) }

    // create notification for responsables
    try{
      const [resps] = await pool.execute('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [id])
      const msg = `NC #${id} actualizada: ${payload.estado_flujo || ''} ${payload.estado_validacion ? '- ' + payload.estado_validacion : ''}`
      for(const r of (resps||[])){
        await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [r.usuario_id, 'NC_UPDATED', msg, `/nc/${id}`])
      }
    }catch(e){ console.error('notify responsables error', e) }

    const [updated] = await pool.execute('SELECT * FROM AUDITORIA_NC WHERE id = ?', [id])
    return res.json(updated[0])
  }catch(err){ console.error('updateNC error', err); return res.status(500).json({ error: 'internal_error' }) }
}

// corrective actions endpoints
async function listActions(req, res){
  try{
    const id = Number(req.params.id)
    const workspaceId = req.user.workspace_id || null;
    if(!id) return res.status(400).json({ error: 'id required' })

    // Validate Ownership (IDOR Fix)
    const [check] = await pool.execute(
      `SELECT a.id FROM AUDITORIA_NC a JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id WHERE a.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    );
    if (!check || check.length === 0) return res.status(404).json({ error: 'not_found' });

    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id = ? ORDER BY fecha_accion ASC', [id])
    return res.json(rows)
  }catch(err){ console.error('listActions error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function createAction(req, res){
  try{
    const id = Number(req.params.id)
    const user = req.user
    const workspaceId = user.workspace_id || null;
    if(!id) return res.status(400).json({ error: 'id required' })

    // Validate Ownership (IDOR Fix)
    const [check] = await pool.execute(
      `SELECT a.id FROM AUDITORIA_NC a JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id WHERE a.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    );
    if (!check || check.length === 0) return res.status(404).json({ error: 'not_found' });

    const payload = req.body || {}

    // Validar que la acción no quede vacía (RF-AC-01-CA-007)
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

async function listByEvaluacion(req, res){
  try{
    const evaluacionId = req.params.id;
    const workspaceId = req.user.workspace_id || null;
    if(!evaluacionId) return res.status(400).json({ error: 'id required' });

    // Ensure evaluation belongs to workspace via JOIN (IDOR Fix)
    const [rows] = await pool.execute(
      `SELECT a.id, a.evaluador_id, a.estado_flujo, a.estado_validacion, a.fecha_verificacion_eficacia, a.comentario_nc, a.fecha_ultima_edicion, a.titulo, a.descripcion 
       FROM AUDITORIA_NC a 
       JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id 
       WHERE a.evaluacion_requisito_id = ? AND er.workspace_id = ?`, 
      [evaluacionId, workspaceId]
    );

    try{
      for(const r of (rows||[])){
        const [respRows] = await pool.execute(
          `SELECT u.id, u.nombre, u.email FROM AUDITORIA_NC_RESPONSABLES ar JOIN USUARIOS u ON u.id = ar.usuario_id WHERE ar.auditoria_nc_id = ?`,
          [r.id]
        )
        r.responsables = respRows || []
      }
    }catch(e){
      console.error('attach responsables error', e)
      for(const r of (rows||[])) r.responsables = []
    }
    return res.json(rows);
  }catch(err){
    console.error('listByEvaluacion error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function getNC(req, res){
  try{
    const id = Number(req.params.id)
    const workspaceId = req.user.workspace_id || null;
    if(!id) return res.status(400).json({ error: 'id required' })

    // Changed to INNER JOIN and added workspace_id check (IDOR Fix)
    const [rows] = await pool.execute(
      `SELECT a.*, er.requisito_base_id
       FROM AUDITORIA_NC a
       JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
       WHERE a.id = ? AND er.workspace_id = ?`,
      [id, workspaceId]
    )
    if(!rows || rows.length===0) return res.status(404).json({ error: 'not_found' })
    const nc = rows[0]
    try{
      const [respRows] = await pool.execute(
        `SELECT u.id, u.nombre, u.email FROM AUDITORIA_NC_RESPONSABLES ar JOIN USUARIOS u ON u.id = ar.usuario_id WHERE ar.auditoria_nc_id = ?`,
        [id]
      )
      nc.responsables = respRows || []
    }catch(e){
      nc.responsables = []
    }
    return res.json(nc)
  }catch(err){ console.error('getNC error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function getNCHistory(req, res){
  try{
    const id = Number(req.params.id)
    const workspaceId = req.user.workspace_id || null
    if(!id) return res.status(400).json({ error: 'id required' })

    const [rows] = await pool.execute(
      `SELECT h.id, h.nc_id, h.estado_flujo, h.estado_validacion, h.fecha_verificacion_eficacia, h.comentario, h.evaluador_id, h.evaluado_id, h.ultima_edicion_por, h.fecha_snapshot, u.nombre as usuario_nombre
       FROM AUDITORIA_NC_HIST h
       LEFT JOIN USUARIOS u ON u.id = h.ultima_edicion_por
       WHERE h.nc_id = ? AND EXISTS (
         SELECT 1 FROM AUDITORIA_NC a JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id WHERE a.id = ? AND er.workspace_id = ?
       )
       ORDER BY h.fecha_snapshot DESC`,
      [id, id, workspaceId]
    )
    return res.json(rows)
  }catch(err){ console.error('getNCHistory error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function getNCHistoryByEvaluacion(req, res){
  try{
    const evaluacionId = Number(req.params.id)
    const workspaceId = req.user.workspace_id || null
    if(!evaluacionId) return res.status(400).json({ error: 'id required' })

    const [rows] = await pool.execute(
      `SELECT h.id, h.nc_id, a.titulo as nc_titulo, h.estado_flujo, h.estado_validacion, h.fecha_verificacion_eficacia, h.ultima_edicion_por, h.fecha_snapshot, u.nombre as usuario_nombre
       FROM AUDITORIA_NC_HIST h
       JOIN AUDITORIA_NC a ON h.nc_id = a.id
       JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
       LEFT JOIN USUARIOS u ON u.id = h.ultima_edicion_por
       WHERE er.id = ? AND er.workspace_id = ?
       ORDER BY h.fecha_snapshot DESC`,
      [evaluacionId, workspaceId]
    )
    return res.json(rows)
  }catch(err){ console.error('getNCHistoryByEvaluacion error', err); return res.status(500).json({ error: 'internal_error' }) }
}

module.exports = { createNC, deleteNC, listByEvaluacion, updateNC, listActions, createAction, getNC, getNCHistory, getNCHistoryByEvaluacion };