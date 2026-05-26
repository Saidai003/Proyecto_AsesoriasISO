const { pool } = require('../db')

async function listNotifications(req, res){
  try{
    const uid = req.user && req.user.id
    if(!uid) return res.status(401).json({ error: 'unauth' })
    const [rows] = await pool.execute('SELECT id, tipo, mensaje, link, read_flag, created_at FROM NOTIFICACIONES WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 50', [uid])
    return res.json(rows)
  }catch(err){ console.error('listNotifications error', err); return res.status(500).json({ error: 'internal_error' }) }
}

async function markRead(req, res){
  try{
    const id = Number(req.params.id)
    if(!id) return res.status(400).json({ error: 'id required' })
    await pool.execute('UPDATE NOTIFICACIONES SET read_flag = 1 WHERE id = ?', [id])
    return res.json({ ok: true })
  }catch(err){ console.error('markRead error', err); return res.status(500).json({ error: 'internal_error' }) }
}

// Clear (delete) notifications related to a requisito for the current user
async function clearForRequisito(req, res){
  try{
    const requisitoId = Number(req.params.id)
    if(!requisitoId) return res.status(400).json({ error: 'id required' })
    const uid = req.user && req.user.id
    if(!uid) return res.status(401).json({ error: 'unauth' })
    // Delete notifications that reference NCs whose evaluacion -> requisito_base_id matches
    await pool.execute(
      `DELETE n FROM NOTIFICACIONES n
       JOIN AUDITORIA_NC a ON n.link = CONCAT('/nc/', a.id)
       JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
       WHERE er.requisito_base_id = ? AND n.usuario_id = ?`,
      [requisitoId, uid]
    )
    return res.json({ ok: true })
  }catch(err){ console.error('clearForRequisito error', err); return res.status(500).json({ error: 'internal_error' }) }
}

module.exports = { listNotifications, markRead, clearForRequisito }
