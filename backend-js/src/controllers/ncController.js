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

module.exports = { createNC, deleteNC, listByEvaluacion };
