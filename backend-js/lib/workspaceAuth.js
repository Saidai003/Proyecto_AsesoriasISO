const { pool } = require('../db')

/**
 * Verifies that a given entity belongs to the user's workspace.
 * - Returns truthy if valid (entity row or {} for admin users)
 * - Returns null/falsy if not found/invalid
 * 
 * @param {number|{id:number,type:string}} entity - ID or {id, type} object
 * @param {string} entityType - Type: 'nc', 'accion', 'evaluacion', 'requisito', 'chat'
 * @param {number} workspaceId - The user's workspace ID (null for admin/super-admin)
 * @returns {Promise<Object|null>} Truthy if access granted, null otherwise
 */
async function verifyWorkspaceAccess(entity, entityType, workspaceId) {
  // Accept object notation: verifyWorkspaceAccess({id, type}, workspaceId)
  if (typeof entity === 'object' && entity !== null) {
    workspaceId = entityType
    entityType = entity.type
    entity = entity.id
  }
  
  // Admin users (no workspaceId) have unrestricted access
  if (!workspaceId) return { id: entity }
  
  let sql, params
  
  switch (entityType) {
    case 'nc':
      sql = `SELECT a.id FROM AUDITORIA_NC a 
             JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id 
             WHERE a.id = ? AND er.workspace_id = ?`
      params = [entity, workspaceId]
      break
    case 'accion':
      sql = `SELECT ac.id FROM ACCIONES_CORRECTIVAS ac
             JOIN AUDITORIA_NC anc ON ac.auditoria_nc_id = anc.id
             JOIN EVALUACION_REQUISITO er ON anc.evaluacion_requisito_id = er.id
             WHERE ac.id = ? AND er.workspace_id = ?`
      params = [entity, workspaceId]
      break
    case 'evaluacion':
      sql = `SELECT id FROM EVALUACION_REQUISITO WHERE id = ? AND workspace_id = ?`
      params = [entity, workspaceId]
      break
    case 'requisito':
      sql = `SELECT rb.id FROM REQUISITOS_BASE rb
             JOIN CLAUSULAS c ON rb.clausula_id = c.id
             JOIN ISOS i ON c.iso_id = i.id
             JOIN ESPACIO_TRABAJO et ON rb.workspace_id = et.id
             WHERE rb.id = ? AND et.id = ?`
      params = [entity, workspaceId]
      break
    case 'chat':
      sql = `SELECT anc.id FROM AUDITORIA_NC anc
             JOIN EVALUACION_REQUISITO er ON anc.evaluacion_requisito_id = er.id
             WHERE anc.id = ? AND er.workspace_id = ?`
      params = [entity, workspaceId]
      break
    default:
      return null
  }
  
  try {
    const [rows] = await pool.execute(sql, params)
    return rows && rows.length > 0 ? rows[0] : null
  } catch (e) {
    console.error(`verifyWorkspaceAccess error for ${entityType}:`, e)
    return null
  }
}

module.exports = { verifyWorkspaceAccess }