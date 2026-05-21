const { pool } = require('../db')
const driveService = require('../services/driveService')

async function run(){
  console.log('Starting deleteAllEvidences')
  const conn = await pool.getConnection()
  try{
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT * FROM EVIDENCIAS')
    console.log('Found', (rows||[]).length, 'evidences')
    for(const ev of rows){
      try{
        // insert log before delete to preserve FK integrity
        await conn.query('INSERT INTO EVIDENCIAS_LOG (evidencia_id, usuario_id, ev_id, tipo_accion, nombre_archivo) VALUES (?,?,?,?,?)', [ev.id, ev.usuario_carga_id || null, ev.ev_id || null, 'BULK_DELETE', ev.nombre_archivo || ''])
      }catch(err){ console.error('log insert failed for', ev.id, err) }
      // attempt to delete drive file if present (best-effort)
      if(ev.drive_file_id){
        try{
          await driveService.deleteFile(ev.drive_file_id)
          console.log('Deleted drive file', ev.drive_file_id)
        }catch(err){
          console.error('drive delete failed for', ev.drive_file_id, String(err && err.message || err))
        }
      }
      try{
        await conn.query('DELETE FROM EVIDENCIAS WHERE id = ?', [ev.id])
        console.log('Deleted DB evidence', ev.id)
      }catch(err){ console.error('failed to delete evidence row', ev.id, err) }
    }
    await conn.commit()
    console.log('Bulk delete completed')
  }catch(err){
    console.error('deleteAllEvidences error', err)
    try{ await conn.rollback() }catch(_){ }
  }finally{
    conn.release()
    process.exit(0)
  }
}

run()
