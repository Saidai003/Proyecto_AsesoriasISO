const { pool } = require('../db');

// Return or create the EVALUACION_REQUISITO row for the current user's workspace and requisito_base_id.
// This endpoint is useful to ensure that an evaluacion row exists
// for a requisito when we want to create an NC linked to it, or when
// the frontend needs the evaluacion ID + estado_cumplimiento to display the requirement view.
// It only returns one row per requisito+workspace (enforced by UNIQUE constraint).
async function getOrCreateEvaluacion(req, res){
  try{
    const requisitoId = req.params.id;
    if(!requisitoId) return res.status(400).json({ error: 'id required' });
    const user = req.user || {};
    const workspaceId = user.workspace_id || null;

    // Check if evaluacion already exists for this requisito + workspace
    const [rows] = await pool.execute('SELECT id, estado_cumplimiento FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?', [requisitoId, workspaceId]);
    if(rows && rows.length) return res.json({ id: rows[0].id, estado_cumplimiento: rows[0].estado_cumplimiento });

    // If not found, create a new one with default estado "NA"
    const [ins] = await pool.execute('INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, fecha_ultima_edicion) VALUES (?, ?, ?, NOW())', [requisitoId, workspaceId, 'NA']);
    return res.status(201).json({ id: ins.insertId, estado_cumplimiento: 'NA' });
  }catch(err){
    console.error('getOrCreateEvaluacion error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Update estado_cumplimiento for a specific evaluacion (by evaluacion ID).
// Used primarily by the Evaluador to mark a requisito as "NA" (No Aplica),
// which excludes it from the compliance percentage calculation in the dashboard
// per ISO 9001:2015 Requisito 4.3 (scope exclusion).
//
// The ID comes from req.params.id (URL path parameter), not from req.body.
// req.body contains only the new state: { estado_cumplimiento: "NA" | "Cumple" | ... }
// The destructuring { estado_cumplimiento } = req.body extracts that property from the object.
//
// Note: When a requisito is marked NA manually, any subsequent change to its
// evidences or brechas won't automatically override the NA state in the DB.
// The frontend calculates a display state (Cumple/No Cumple/En Revisión) but
// the DB field estado_cumplimiento is the source of truth for the dashboard.
async function updateEvaluacionEstado(req, res){
  try{
    const id = Number(req.params.id);
    if(!id) return res.status(400).json({ error: 'id required' });
    const user = req.user || {};
    const workspaceId = user.workspace_id || null;

    // req.body is a JS object (parsed from JSON by express.json() middleware).
    // The {} in { estado_cumplimiento } = req.body is destructuring assignment,
    // which extracts the property "estado_cumplimiento" from the object.
    const { estado_cumplimiento } = req.body || {};

    const allowed = ['Cumple', 'Parcial', 'No cumple', 'NA'];
    if(!estado_cumplimiento || !allowed.includes(estado_cumplimiento)){
      return res.status(400).json({ error: 'invalid_estado', allowed });
    }

    // Validate ownership: the evaluacion must belong to the user's workspace (IDOR protection)
    const [rows] = await pool.execute(
      'SELECT id FROM EVALUACION_REQUISITO WHERE id = ? AND workspace_id = ?',
      [id, workspaceId]
    );
    if(!rows || !rows.length) return res.status(404).json({ error: 'not_found' });

    await pool.execute(
      'UPDATE EVALUACION_REQUISITO SET estado_cumplimiento = ?, ultima_edicion_por = ?, fecha_ultima_edicion = NOW() WHERE id = ?',
      [estado_cumplimiento, user.id, id]
    );

    // Insert history snapshot for traceability
    try{
      await pool.execute(
        'INSERT INTO EVALUACION_REQUISITO_HIST (ev_id, estado_cumplimiento, ultima_edicion_por, fecha_snapshot, accion) VALUES (?, ?, ?, NOW(), ?)',
        [id, estado_cumplimiento, user.id, `Estado cambiado a ${estado_cumplimiento}`]
      );
    }catch(e){ console.error('insert eval hist error', e); }

    return res.json({ ok: true, estado_cumplimiento });
  }catch(err){
    console.error('updateEvaluacionEstado error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Auto update requirement compliance status based on evidences and non-conformities
async function autoUpdateEstado(req, res){
  try {
    const id = Number(req.params.id);
    if(!id) return res.status(400).json({ error: 'id required' });
    const user = req.user || {};
    const workspaceId = user.workspace_id || null;

    let evalQuery = 'SELECT id, estado_cumplimiento FROM EVALUACION_REQUISITO WHERE id = ?';
    let evalParams = [id];
    if (user.role !== 'Admin' || workspaceId !== null) {
      evalQuery += ' AND workspace_id = ?';
      evalParams.push(workspaceId);
    }
    const [rows] = await pool.execute(evalQuery, evalParams);
    if(!rows || !rows.length) return res.status(404).json({ error: 'not_found' });

    const currentEstado = rows[0].estado_cumplimiento;
    if(currentEstado === 'NA') {
      return res.json({ ok: true, estado_cumplimiento: 'NA', changed: false });
    }

    // Consult evidences
    const [evidences] = await pool.execute(
      'SELECT estado_validacion_archivo FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?',
      [id]
    );

    // Consult NCs
    const [ncs] = await pool.execute(
      'SELECT estado_flujo FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?',
      [id]
    );

    const totalEvidencias = evidences.length;
    const evidenciasAceptadas = evidences.filter(ev => ev.estado_validacion_archivo === 'Aceptado').length;
    const evidenciasRechazadas = evidences.filter(ev => ev.estado_validacion_archivo === 'Rechazado').length;

    const totalBrechas = ncs.length;
    const brechasCerradas = ncs.filter(nc => nc.estado_flujo === 'Cerrada').length;
    const brechasAbiertas = totalBrechas - brechasCerradas;

    let calculado = 'No cumple'; // default / No Evaluado
    if (totalEvidencias === 0 && totalBrechas === 0) {
      calculado = 'No cumple'; // No Evaluado maps to No cumple
    } else if (totalEvidencias > 0 && evidenciasAceptadas === totalEvidencias && brechasAbiertas === 0) {
      calculado = 'Cumple';
    } else if (brechasAbiertas > 0 || evidenciasRechazadas > 0) {
      calculado = 'No cumple';
    } else {
      calculado = 'Parcial'; // En Revisión
    }

    let changed = false;
    if (calculado !== currentEstado) {
      await pool.execute(
        'UPDATE EVALUACION_REQUISITO SET estado_cumplimiento = ?, ultima_edicion_por = ?, fecha_ultima_edicion = NOW() WHERE id = ?',
        [calculado, user.id, id]
      );
      // Insert history
      try {
        await pool.execute(
          'INSERT INTO EVALUACION_REQUISITO_HIST (ev_id, estado_cumplimiento, ultima_edicion_por, fecha_snapshot, accion) VALUES (?, ?, ?, NOW(), ?)',
          [id, calculado, user.id, `Estado auto-calculado: ${calculado}`]
        );
      } catch (e) {
        console.error('insert eval auto-hist error', e);
      }
      changed = true;
    }

    return res.json({ ok: true, estado_cumplimiento: calculado, changed });
  } catch (err) {
    console.error('autoUpdateEstado error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { getOrCreateEvaluacion, updateEvaluacionEstado, autoUpdateEstado };
