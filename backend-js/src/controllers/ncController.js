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
    if(!id) return res.status(400).json({ error: 'id required' });
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
    const role = user && user.role ? user.role : ''
    const isAdmin = role === 'Admin'
    const payload = req.body || {}
    console.log('updateNC called id:', id, 'user:', user && user.id, 'role:', role, 'payload:', payload)
    console.log('updateNC beginning processing...')
    const [rows] = await pool.execute('SELECT * FROM AUDITORIA_NC WHERE id = ?', [id])
    if(!rows || rows.length===0) return res.status(404).json({ error: 'not_found' })
    const nc = rows[0]

    const updates = []
    const params = []

    // validation state change (APPROVAL) - allowed for Evaluador and Responsable for some cases
    if(Object.prototype.hasOwnProperty.call(payload, 'estado_validacion')){
      // only evaluador can set validation? allow both but record
      updates.push('estado_validacion = ?'); params.push(payload.estado_validacion)
      // insert notification to evaluator or responsables
    }

    // flow state change
    if(Object.prototype.hasOwnProperty.call(payload, 'estado_flujo')){
      let newFlow = payload.estado_flujo
      // if no actual change, skip flow validation (avoid rejecting unchanged value)
      const current = nc.estado_flujo
      if(newFlow === current){
        // no-op: do not attempt to validate/change
      }else{
        // enforce role rules
        if(current === 'Verificación' || current === 'Cerrada'){
          console.log('updateNC forbidden: current is final state', current)
          return res.status(403).json({ error: 'no_se_puede_cambiar_desde_estado_final', message: 'No se puede cambiar la NC porque está en un estado final.' })
        }
        if(role === 'Responsable SGC' || isAdmin){
          // responsable can only move to Análisis or Ejecución from Abierta
          if(current !== 'Abierta'){ console.log('updateNC forbidden: responsable current != Abierta', 'current:', current); return res.status(403).json({ error: 'forbidden' }) }
          if(!['Análisis','Ejecución'].includes(newFlow)){ console.log('updateNC invalid_target_state for responsable', 'newFlow:', newFlow); return res.status(400).json({ error: 'invalid_target_state' }) }
        }else if(role === 'Evaluador' || isAdmin){
          // evaluator can set to Abierta, Verificación, Cerrada
          if(!['Abierta','Verificación','Cerrada'].includes(newFlow)){ console.log('updateNC invalid_target_state for evaluador', 'newFlow:', newFlow); return res.status(400).json({ error: 'invalid_target_state' }) }
        }else{
          return res.status(403).json({ error: 'forbidden' })
        }
        // If moving to Verificación, require fecha_verificacion_eficacia in payload and validate
        // normalize and validate newFlow against allowed enum values to avoid encoding/truncation issues
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
            // debug: log newFlow type/length/encoding
            try{ console.log('updateNC newFlow:', JSON.stringify(newFlow), 'type:', typeof newFlow, 'len:', newFlow && newFlow.length) }catch(e){}
            updates.push('estado_flujo = ?'); params.push(newFlow)
          // store only the DATE part (YYYY-MM-DD) because columna es DATE
          const dateOnly = new Date(ts).toISOString().slice(0,10)
          updates.push('fecha_verificacion_eficacia = ?'); params.push(dateOnly)
          // schedule a notification for the evaluator when the date arrives
          try{
            // insert scheduled notification for evaluator (a.evaluador_id)
            const evaluatorId = nc.evaluador_id
            console.log('scheduling notification for nc:', id, 'evaluatorId:', evaluatorId, 'trigger_ts:', new Date(ts).toISOString())
            if(evaluatorId){
              const schedSql = 'INSERT INTO SCHEDULED_NOTIFICATIONS (nc_id, usuario_id, trigger_at, created_at, sent_flag) VALUES (?, ?, ?, NOW(), 0)'
              const schedParams = [id, evaluatorId, new Date(ts)]
              console.log('scheduling SQL:', schedSql, 'params:', schedParams)
              await pool.execute(schedSql, schedParams)
            }
          }catch(e){ console.error('schedule notification error', e) }
        } else {
          updates.push('estado_flujo = ?'); params.push(newFlow)
        }
      }
    }

    if(updates.length===0){ console.log('updateNC nothing_to_update, payload keys:', Object.keys(payload)); return res.status(400).json({ error: 'nothing_to_update' }) }
    params.push(id)
    const sql = `UPDATE AUDITORIA_NC SET ${updates.join(', ')}, ultima_edicion_por = ?, fecha_ultima_edicion = NOW() WHERE id = ?`
    const sqlParams = [ ...(params.slice(0,-1)), user.id, params[params.length-1] ]
      try{
        console.log('updateNC SQL:', sql)
        console.log('updateNC params full:', params, 'sqlParams:', sqlParams)
        sqlParams.forEach((p,i)=>{
          try{ console.log('param['+i+'] ('+ (p===null? 'null': typeof p) +'):', JSON.stringify(p)) }catch(e){}
        })
        await pool.execute(sql, sqlParams)
      }catch(ex){
        console.error('updateNC execute error', ex, 'sql:', sql, 'sqlParams:', sqlParams)
        // rethrow to outer catch for consistent handling
        throw ex
      }

    // insert history
    try{
      await pool.execute('INSERT INTO AUDITORIA_NC_HIST (nc_id, estado_flujo, estado_validacion, fecha_snapshot, ultima_edicion_por) VALUES (?, ?, ?, NOW(), ?)', [id, payload.estado_flujo || nc.estado_flujo, payload.estado_validacion || nc.estado_validacion, user.id])
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
    if(!id) return res.status(400).json({ error: 'id required' })
    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE auditoria_nc_id = ? ORDER BY fecha_accion ASC', [id])
    return res.json(rows)
  }catch(err){ console.error('listActions error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function createAction(req, res){
  try{
    const id = Number(req.params.id)
    const user = req.user
    if(!id) return res.status(400).json({ error: 'id required' })
    const payload = req.body || {}
    const accion_previa_id = payload.accion_previa_id || null
    const accion = payload.accion || ''
    const contenido_comentario = payload.contenido_comentario || ''
    const estado_accion = payload.estado_accion || 'Pendiente'
    const acciones_futuras_propuestas = payload.acciones_futuras_propuestas || ''
    const requiere_nueva_nc = payload.requiere_nueva_nc ? 1 : 0

    const [result] = await pool.execute('INSERT INTO ACCIONES_CORRECTIVAS (auditoria_nc_id, accion_previa_id, autor_id, tipo_autor, nc, accion, contenido_comentario, estado_accion, acciones_futuras_propuestas, requiere_nueva_nc, fecha_accion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [id, accion_previa_id, user.id, user.role || 'Responsable SGC', `NC #${id}`, accion, contenido_comentario, estado_accion, acciones_futuras_propuestas, requiere_nueva_nc])
    const insertId = result.insertId
    // notify responsables and evaluator
    try{
      const [resps] = await pool.execute('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES WHERE auditoria_nc_id = ?', [id])
      const msg = `Nueva acción correctiva para NC #${id}: ${accion}`
      for(const r of (resps||[])){
        await pool.execute('INSERT INTO NOTIFICACIONES (usuario_id, tipo, mensaje, link) VALUES (?, ?, ?, ?)', [r.usuario_id, 'ACCION_NC', msg, `/nc/${id}`])
      }
    }catch(e){ console.error('notify on action error', e) }

    const [rows] = await pool.execute('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id = ?', [insertId])
    return res.status(201).json(rows[0])
  }catch(err){ console.error('createAction error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function listByEvaluacion(req, res){
  try{
    const evaluacionId = req.params.id;
    if(!evaluacionId) return res.status(400).json({ error: 'id required' });
    const [rows] = await pool.execute('SELECT id, evaluador_id, estado_flujo, estado_validacion, fecha_verificacion_eficacia, comentario_nc, fecha_ultima_edicion, titulo, descripcion FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?', [evaluacionId]);
    return res.json(rows);
  }catch(err){
    console.error('listByEvaluacion error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function getNC(req, res){
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    // include evaluacion_requisito_id and join to EVALUACION_REQUISITO to expose requisito_base_id
    const [rows] = await pool.execute(
      `SELECT a.*, er.requisito_base_id
       FROM AUDITORIA_NC a
       LEFT JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
       WHERE a.id = ?`,
      [id]
    )
    if(!rows || rows.length===0) return res.status(404).json({ error: 'not_found' })
    return res.json(rows[0])
  }catch(err){ console.error('getNC error', err); return res.status(500).json({ error: 'internal_error' }) }
}

module.exports = { createNC, deleteNC, listByEvaluacion, updateNC, listActions, createAction, getNC };
