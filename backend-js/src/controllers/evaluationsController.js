const { pool } = require('../db');

// Return or create the EVALUACION_REQUISITO row for the current user's workspace and requisito_base_id
async function getOrCreateEvaluacion(req, res){
  try{
    // This endpoint is useful to ensure that an evaluacion row exists
    //  for a requisito when we want to create an NC linked to it.
    const requisitoId = req.params.id;
    if(!requisitoId) return res.status(400).json({ error: 'id required' });
    const user = req.user || {};
    const workspaceId = user.workspace_id || null;

    const [rows] = await pool.execute('SELECT id FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?', [requisitoId, workspaceId]);
    if(rows && rows.length) return res.json({ id: rows[0].id });
    // only returns the id from the first row of the result set, 
    // which is what we expect since there should be at most 
    // one evaluacion per requisito+workspace
    // Is it possible to see another evaluacion for the same requisito?
    // Yes, but it would be an edge case that we can ignore for now.

    const [ins] = await pool.execute('INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, fecha_ultima_edicion) VALUES (?, ?, ?, NOW())', [requisitoId, workspaceId, 'NA']);
    return res.status(201).json({ id: ins.insertId });
  }catch(err){
    console.error('getOrCreateEvaluacion error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { getOrCreateEvaluacion };
