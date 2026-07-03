const { pool } = require('../db')

/**
 * Verifica que un usuario tenga acceso a un recurso específico de su workspace.
 * @param {number} resourceId - ID del recurso (ej: evaluacion_requisito_id)
 * @param {string} resourceType - Tipo de recurso ('evaluacion', 'nc', 'accion')
 * @param {number} workspaceId - ID del workspace del usuario
 * @returns {Promise<boolean>} - true si el recurso pertenece al workspace
 */
async function verifyWorkspaceAccess(resourceId, resourceType, workspaceId) {
  if (!resourceId || !workspaceId) return false
  
  try {
    let sql = ''
    
    switch (resourceType) {
      case 'evaluacion':
        // Verifica que la evaluacion_requisito pertenezca al workspace
        sql = `SELECT id FROM EVALUACION_REQUISITO WHERE id = ? AND workspace_id = ?`
        break
      case 'nc':
        // Verifica que la NC pertenezca al workspace vía evaluacion_requisito
        sql = `SELECT a.id FROM AUDITORIA_NC a 
               JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id 
               WHERE a.id = ? AND er.workspace_id = ?`
        break
      case 'accion':
        // Verifica que la acción pertenezca al workspace vía NC -> evaluacion_requisito
        sql = `SELECT ac.id FROM ACCIONES_CORRECTIVAS ac
               JOIN AUDITORIA_NC a ON ac.auditoria_nc_id = a.id
               JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
               WHERE ac.id = ? AND er.workspace_id = ?`
        break
      default:
        return false
    }
    
    const [rows] = await pool.execute(sql, [resourceId, workspaceId])
    return rows && rows.length > 0
  } catch (err) {
    console.error('verifyWorkspaceAccess error:', err)
    return false
  }
}

module.exports = { verifyWorkspaceAccess }