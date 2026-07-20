const { pool } = require('../db')
const path = require('path')

function resolveWorkspaceId(req){
  const user = req.user || {}
  if(user.workspace_id) return Number(user.workspace_id)
  if(user.role === 'Admin'){
    const src = { ...(req.query || {}), ...(req.body || {}) }
    const wid = src.workspace || src.workspace_id
    const n = wid ? Number(wid) : null
    if(n && !Number.isNaN(n)) return n
  }
  return null
}

async function getEvidenceInWorkspace(evidenceId, req){
  const user = req.user || {}
  const workspaceId = resolveWorkspaceId(req)
  const isAdmin = user.role === 'Admin'

  if(workspaceId == null && !isAdmin){
    return { error: 'forbidden', status: 403 }
  }

  // pool.query devuelve [filas, metadatos]; guardamos solo las filas en una variable clara
  let queryResult
  if(workspaceId != null){
    queryResult = await pool.query(
      `SELECT e.* FROM EVIDENCIAS e
       JOIN EVALUACION_REQUISITO er ON e.evaluacion_requisito_id = er.id
       WHERE e.id = ? AND er.workspace_id = ?`,
      [evidenceId, workspaceId]
    )
  }else{
    queryResult = await pool.query('SELECT * FROM EVIDENCIAS WHERE id = ?', [evidenceId])
  }

  const rows = queryResult[0]
  if(!rows || rows.length === 0){
    return { error: 'not_found', status: 404 }
  }

  return { evidence: rows[0] }
}

async function listByRequisito(req, res){
  const requisitoId = Number(req.params.id) || 0;
  try{
    const workspaceId = resolveWorkspaceId(req)
    if(workspaceId == null && req.user?.role !== 'Admin'){
      return res.status(403).json({ error: 'forbidden' })
    }
    // Resolve the EVALUACION_REQUISITO id from requisito_base_id + workspace
    let evaluacionRequisitoId = requisitoId
    if(workspaceId != null){
      const [check] = await pool.query(
        'SELECT id FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?',
        [requisitoId, workspaceId]
      )
      if(!check || !check.length) return res.json({ evidencias: [] })
      evaluacionRequisitoId = check[0].id
    }
    const [rows] = await pool.query('SELECT * FROM EVIDENCIAS WHERE evaluacion_requisito_id = ? ORDER BY fecha_carga DESC', [evaluacionRequisitoId])
    // enrich with drive metadata when available
    // What does Promise.all do?
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
    // it is a function that takes an iterable of promises as an argument and returns
    // a single promise that resolves when all of the input promises have resolved or rejected
    const enriched = await Promise.all(rows.map(async (r) => {
      if(r.drive_file_id){
        try{
          const meta = await driveService.getFileMeta(r.drive_file_id, 'id,name,mimeType')
          return { ...r, drive_meta: meta }
        }catch(_){
          return r
        }
      }
      return r
    }))
    // Note: we return the enriched list even if 
    // some Drive metadata lookups failed, to allow partial
    // success results instead of total failure.
    return res.json({ evidencias: enriched })
  }catch(err){
    console.error('listByRequisito error', err)
    // fallback to small placeholder so frontend still works during dev
    const now = new Date();
    const placeholders = [
      { id: 1001, evaluacion_requisito_id: requisitoId || 1, usuario_carga_id: 5, ev_id: 1, nombre_archivo: 'evidencia_01.pdf', url_archivo: '', tipo_formato: 'pdf', estado_validacion_archivo: 'Pendiente', comentario_evidencia: 'Evidencia cargada manualmente (placeholder).', fecha_carga: now.toISOString().slice(0,10) },
      { id: 1002, evaluacion_requisito_id: requisitoId || 1, usuario_carga_id: 8, ev_id: 1, nombre_archivo: 'foto_entrada.jpg', url_archivo: '', tipo_formato: 'jpg', estado_validacion_archivo: 'Aceptado', comentario_evidencia: 'Placeholder: imagen de la entrada.', fecha_carga: now.toISOString().slice(0,10) }
    ]
    return res.json({ evidencias: placeholders })
  }
}

// Stream/download the actual file for an evidence id
async function downloadEvidence(req, res){
  const id = Number(req.params.id) || 0
  try{
    const lookup = await getEvidenceInWorkspace(id, req)
    if(lookup.error) return res.status(lookup.status).json({ error: lookup.error })
    const ev = lookup.evidence
    const role = req.user && req.user.role ? req.user.role : ''
    const uid = req.user && req.user.id ? req.user.id : null
    // Workspace members (Admin/Evaluador/Responsable) or uploader may download
    if(role !== 'Admin' && role !== 'Evaluador' && role !== 'Responsable SGC' && ev.usuario_carga_id !== uid){
      return res.status(403).json({ error: 'forbidden' })
    }
    if(ev.drive_file_id){
      try{
        const file = await driveService.downloadFile(ev.drive_file_id)
        res.setHeader('Content-Type', file.mimeType || 'application/octet-stream')
        // If client requests inline display, don't force attachment
        if(req.query && (req.query.inline === '1' || req.query.inline === 'true')){
          res.setHeader('Content-Disposition', `inline; filename="${file.name}"`)
        }else{
          res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
        }
        file.stream.pipe(res)
        return
      }catch(err){
        console.error('drive download error', err)
        const errMsg = err && err.message ? err.message : String(err)
        const lower = errMsg.toLowerCase()
        if(lower.includes('no_saved_token') || lower.includes('no access') || lower.includes('refresh token')){
          try{ const authUrl = require('../services/driveService').generateAuthUrl(); return res.status(503).json({ error: errMsg, authUrl }) }catch(_){ }
        }
        return res.status(500).json({ error: errMsg })
      }
    }
    // Only Drive-hosted files are supported now
    return res.status(404).json({ error: 'file_not_available' })
  }catch(err){
    console.error('downloadEvidence error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

const fs = require('fs').promises
const driveService = require('../services/driveService')

// Build a numeric hierarchical folder name for a requisito from evaluacion_requisito id
// Produces names like "4-1" or "4-1-1" (clauseNumber - requisitoIndex - subIndex...)
async function buildRequisitoFolderNameByEvaluacionId(evaluacionId){
  try{
    if(!evaluacionId) return `evaluacion-${evaluacionId}`
    const qres = await pool.query(
      'SELECT er.requisito_base_id, rb.descripcion_normativa FROM EVALUACION_REQUISITO er LEFT JOIN REQUISITOS_BASE rb ON er.requisito_base_id = rb.id WHERE er.id = ?',
      [evaluacionId]
    )
    const rows = Array.isArray(qres) && qres[0] ? qres[0] : []
    if(!rows || !rows.length) return `evaluacion-${evaluacionId}`
    const r = rows[0]
    const desc = r.descripcion_normativa ? String(r.descripcion_normativa).trim() : ''
    if(!desc) return `evaluacion-${evaluacionId}`

    let folderName = desc
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s.,;:\-()/]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 80)

    return folderName || `evaluacion-${evaluacionId}`
  }catch(err){
    return `evaluacion-${evaluacionId}`
  }
}

// Permission helpers for updateEvidence
function _toNumber(v){ return v === null || v === undefined ? null : Number(v) }

function checkEvaluatorRestrictions(role, payload){
  if(role !== 'Evaluador') return true
  const allowed = ['estado_validacion_archivo']
  const keys = Object.keys(payload || {})
  const hasForbidden = keys.some(k => !allowed.includes(k))
  return !hasForbidden
}

function checkStatusChangePermission(role, existing, uid, payload){
  if(!Object.prototype.hasOwnProperty.call(payload, 'estado_validacion_archivo')) return true
  // Only Admin and Evaluador may change approval state
  return role === 'Admin' || role === 'Evaluador'
}

function checkGeneralPermission(role, existing, uid){
  if(role === 'Admin') return true
  // Evaluador: field-level restrictions in checkEvaluatorRestrictions
  if(role === 'Evaluador') return true
  // Responsable and others: only their own uploads
  return _toNumber(existing.usuario_carga_id) === _toNumber(uid)
}

// Checked. Now supports Drive-hosted files
async function createEvidence(req, res){
  try{
    const payload = req.body || {}
    const evaluacion_requisito_id = payload.evaluacion_requisito_id || null
    const usuario_carga_id = req.user && req.user.id ? req.user.id : null
    const workspaceId = resolveWorkspaceId(req)
    if(evaluacion_requisito_id && workspaceId != null){
      const [erCheck] = await pool.query(
        'SELECT id FROM EVALUACION_REQUISITO WHERE id = ? AND workspace_id = ?',
        [evaluacion_requisito_id, workspaceId]
      )
      if(!erCheck || !erCheck.length) return res.status(403).json({ error: 'forbidden' })
    }else if(evaluacion_requisito_id && req.user?.role !== 'Admin'){
      return res.status(403).json({ error: 'forbidden' })
    }
    const ev_id = payload.ev_id || null
    const nombre_archivo = payload.nombre_archivo || ''
    let url_archivo = payload.url_archivo || ''
    const tipo_formato = payload.tipo_formato || ''
    let drive_file_id = null

    // determine workspace folder name/id (workspaceId resolved above)
    let workspaceFolderId = null
    const driveRootId = await driveService.getDriveRootFolderId()
    if(workspaceId && driveRootId){
      // lookup workspace name
      try{
        const [wrows] = await pool.query('SELECT * FROM ESPACIO_TRABAJO WHERE id = ?', [workspaceId])
        
        // Assigns a default workspace name if one is not found.
        // workspaceName resolution strategy: prefer nombre_cliente if available, fallback to 'workspace-{id}' pattern
        const workspaceName = (wrows && wrows[0] && (wrows[0].nombre_cliente || `workspace-${workspaceId}`)) || `workspace-${workspaceId}`
        
        // Raíz por entorno (Development|Production) → subcarpeta por workspace → requisito
        workspaceFolderId = await driveService.ensureFolder(driveRootId, workspaceName)
      }catch(err){
        console.error('workspace folder resolution error', err)
        workspaceFolderId = null
      }
    }

    // Require Google Drive storage for evidence files. Accept either:
    // - payload.drive_file_id (existing Drive id),
    // - payload.url_archivo starting with 'drive://', or
    // - payload.fileData (base64) to upload now.

    // but it only uploads to Drive if the fileData field is provided; 
    // if drive_file_id or drive:// URL is provided, it will link to existing 
    // Drive file without uploading. This allows flexibility for clients to manage 
    // Drive uploads separately if desired, while still enforcing that all evidence 
    // files must be stored on Drive.
    if(payload.drive_file_id){
      drive_file_id = payload.drive_file_id
      url_archivo = `drive://${drive_file_id}`
    } else if(payload.url_archivo && String(payload.url_archivo).startsWith('drive://')){
      // support legacy url_archivo field for Drive links, but normalize to drive_file_id + drive:// URL pattern for consistency
      drive_file_id = String(payload.url_archivo).replace(/^drive:\/\//, '')
      url_archivo = `drive://${drive_file_id}`
    } else if(payload.fileData){
      // match data URL pattern: data:<mime-type>;base64,<data>
      // This allows clients to upload file content directly as base64-encoded strings.
      // We will parse the data URL, extract the MIME type and base64 data, and then 
      // upload the file to Drive. The filename can be provided by the client or generated automatically.
      const matches = String(payload.fileData).match(/^data:(.+);base64,(.+)$/)
      let ext = tipo_formato || ''
      if(!matches) return res.status(400).json({ error: 'invalid_file_data' })

      const mime = matches[1] // MIME type extracted from data URL, e.g. "image/jpeg"
      const b64 = matches[2] // Base64-encoded file content extracted from data URL

      // if tipo_formato is not provided from payload, 
      // attempt to derive file extension from MIME type
      if(!ext){
        const m = mime.split('/')
        ext = m[1] || ext
      }

      // generate filename: prefer provided nombre_archivo, fallback to evidence-{timestamp}-{random}.{ext} pattern
      // the latter ensures a unique filename if multiple uploads have the same original name or if no name is provided,
      // while still preserving the file extension for better handling on Drive and client applications.
      const filename = nombre_archivo || `evidence-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`

      // convert base64 string to buffer for upload. b64 is the base64-encoded file content extracted from the data URL.
      // We create a Buffer from this string, specifying 'base64' as the encoding, which gives us the raw binary data of
      // the file that we can then upload to Drive.

      // We upload and update the file in Drive depending on whether the file already exists (based on filename) in the target folder. 
      // This allows for idempotent uploads where clients can retry with the same data without creating duplicates on Drive.
      const buf = Buffer.from(b64, 'base64')
      try{
        let uploaded = null // basically, what was 'uploaded' to Drive, containing at least the new file id and name
        if(workspaceFolderId){ //this is to ensure that evidence files are stored in subfolders per workspace
          const requisitoName = await buildRequisitoFolderNameByEvaluacionId(evaluacion_requisito_id)
          const requisitoFolderId = await driveService.ensureFolder(workspaceFolderId, requisitoName)
          const existingFile = await driveService.findFileInFolder(requisitoFolderId, filename)
          if(existingFile && existingFile.id){
            await driveService.updateFile(existingFile.id, { buffer: buf, mimeType: mime })
            uploaded = await driveService.getFileMeta(existingFile.id, 'id,name')
          }else{
            uploaded = await driveService.uploadBuffer({ buffer: buf, mimeType: mime, name: filename, parents: [requisitoFolderId] })
          }
        }else{
          // if no workspace folder, upload to root (or default) folder in Drive
          // could prove to be a dumping ground, but at least ensures the file is on Drive as 
          // required, even if we can't organize by workspace. Consider not allowing uploads at all
          // if we can't determine a folder, but for now we allow it as a fallback to ensure functionality
          // even if folder resolution fails.
          uploaded = await driveService.uploadBuffer({ buffer: buf, mimeType: mime, name: filename })
        }
        if(uploaded && uploaded.id){
          drive_file_id = uploaded.id
          url_archivo = `drive://${uploaded.id}`
        }else{
          throw new Error('drive_upload_failed')
        }
      }catch(err){
        console.error('drive upload error', err)
        const m = String(err && err.message || '')
        const lower = m.toLowerCase()
        if(lower.includes('no_saved_token') || lower.includes('no access') || lower.includes('refresh token')){
          try{
            const authUrl = require('../services/driveService').generateAuthUrl()
            return res.status(503).json({ error: m, authUrl })
          }catch(_){ }
        }
        return res.status(500).json({ error: m })
      }
    } else {
      return res.status(400).json({ error: 'file_required' })
    }

    const [result] = await pool.query('INSERT INTO EVIDENCIAS (evaluacion_requisito_id, usuario_carga_id, ev_id, nombre_archivo, url_archivo, tipo_formato, drive_file_id) VALUES (?,?,?,?,?,?,?)', [evaluacion_requisito_id, usuario_carga_id, ev_id, nombre_archivo, url_archivo, tipo_formato, drive_file_id])
    const insertId = result.insertId // get the ID of the inserted row
    // log upload with detail so history shows who cargó y qué archivo
    await pool.query('INSERT INTO EVIDENCIAS_LOG (evidencia_id, usuario_id, ev_id, tipo_accion, nombre_archivo, detalle) VALUES (?,?,?,?,?,?)', [insertId, usuario_carga_id, ev_id, 'UPLOAD', nombre_archivo, `Evidencia cargada: ${nombre_archivo}`])
    const [rows] = await pool.query('SELECT * FROM EVIDENCIAS WHERE id = ?', [insertId])
    return res.status(201).json(rows[0])
  }catch(err){
    console.error('createEvidence error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

// Pending for revision. Now supports updating Drive-hosted files and logging changes.
async function updateEvidence(req, res){
  const id = Number(req.params.id) || 0 // id of the evidence
  try{
    const lookup = await getEvidenceInWorkspace(id, req)
    if(lookup.error) return res.status(lookup.status).json({ error: lookup.error })
    const existing = lookup.evidence
    const role = req.user && req.user.role ? req.user.role : ''
    const uid = req.user && req.user.id ? req.user.id : null
    const payload = req.body || {}

    // If user is Evaluador, only allow setting approval state

    // Where does estado_validacion_archivo come from and what are its possible values?
    // estado_validacion_archivo is a field in the EVIDENCIAS table that represents the approval state of the evidence file. 
    // Its possible values are typically 'Pendiente' (Pending), 'Aceptado' (Accepted), and 'Rechazado' (Rejected), 
    // but it may vary based on the application's specific implementation and requirements.
    // Permission checks delegated to helpers for clarity
    if(!checkEvaluatorRestrictions(role, payload)){
      return res.status(403).json({ error: 'forbidden' })
    }

    if(!checkStatusChangePermission(role, existing, uid, payload)){
      return res.status(403).json({ error: 'forbidden' })
    }

    if(!checkGeneralPermission(role, existing, uid)){
      return res.status(403).json({ error: 'forbidden' })
    }

    const fields = []
    const values = []
    const willLog = []

    // handle file update if provided
    let fileAction = null
    // Preserve the previous Drive file and only update the evidence reference to the new file.
    let forceDeleteResult = null
    if(payload && payload.force_delete_before_upload && existing.drive_file_id){
      forceDeleteResult = {
        ok: true,
        preserved: true,
        message: 'Se conserva el archivo anterior en Drive y se actualiza la referencia de la evidencia al nuevo archivo.'
      }
    }

    if(Object.prototype.hasOwnProperty.call(payload, 'fileData')){
      const matches = String(payload.fileData).match(/^data:(.+);base64,(.+)$/)
      if(matches){
        let mime = matches[1]
        const b64 = matches[2]
        // Normalize MIME type if it contains parameters like charset
        mime = String(mime).split(';')[0].trim().toLowerCase()
        const existingName = existing.nombre_archivo || ''
        const existingExt = path.extname(existingName).toLowerCase()
        // Determine extension from provided nombre_archivo or MIME type when name does not include one.
        let newExt = ''
        if(payload.nombre_archivo){
          newExt = path.extname(payload.nombre_archivo).toLowerCase()
        }
        if(!newExt && mime){
          const mimeExt = mime.split('/')
          if(mimeExt[1]){
            newExt = '.' + mimeExt[1].split('+')[0].toLowerCase()
          }
        }
        // If Drive can determine extension from name or MIME, do not reject updates on strict mismatch.
        // Keep this validation conservative to avoid false negatives from Drive's file extension heuristics.
        if(existingExt && newExt && existingExt !== newExt && payload.nombre_archivo){
          // Only warn or log; do not block in case Drive infers the extension correctly.
          console.warn(`updateEvidence: extension differs but continuing: existing=${existingExt} new=${newExt} mime=${mime}`)
        }

        const buf = Buffer.from(b64, 'base64')

        try{
          // ensure workspace folder and requisito subfolder
          // resolve workspace id for Drive folder resolution (allow Admin to supply via query/body)
          let workspaceIdForDrive = null
          if(req.user && req.user.workspace_id) workspaceIdForDrive = req.user.workspace_id
          else if(req.user && req.user.role === 'Admin'){
            const q = (req.query && (req.query.workspace || req.query.workspace_id)) || (payload && payload.workspace_id)
            const wid = q ? Number(q) : null
            if(wid && !Number.isNaN(wid)) workspaceIdForDrive = wid
          }
          const driveRootId = await driveService.getDriveRootFolderId()
          if(workspaceIdForDrive && driveRootId){
              const [wrows] = await pool.query('SELECT * FROM ESPACIO_TRABAJO WHERE id = ?', [workspaceIdForDrive])
              const workspaceName = (wrows && wrows[0] && (wrows[0].nombre_cliente || `workspace-${workspaceIdForDrive}`)) || `workspace-${workspaceIdForDrive}`
              const workspaceFolderId = await driveService.ensureFolder(driveRootId, workspaceName)
            const requisitoIdToUse = existing.evaluacion_requisito_id ? existing.evaluacion_requisito_id : (payload.evaluacion_requisito_id ? payload.evaluacion_requisito_id : null)
            let requisitoName
            if(workspaceFolderId){
              requisitoName = await buildRequisitoFolderNameByEvaluacionId(requisitoIdToUse)
            }else{
              requisitoName = requisitoIdToUse ? String(requisitoIdToUse) : 'unknown'
            }
            const requisitoFolderId = await driveService.ensureFolder(workspaceFolderId, requisitoName)
            const existingFile = await driveService.findFileInFolder(requisitoFolderId, payload.nombre_archivo || existing.nombre_archivo || `evidence-${Date.now()}`)
            if(existingFile && existingFile.id){
              await driveService.updateFile(existingFile.id, { buffer: buf, mimeType: mime })
              fields.push('drive_file_id = ?'); values.push(existingFile.id)
              fields.push('url_archivo = ?'); values.push(`drive://${existingFile.id}`)
              fileAction = 'REPLACE'
            } else {
              const uploaded = await driveService.uploadBuffer({ buffer: buf, mimeType: mime, name: payload.nombre_archivo || existing.nombre_archivo || `evidence-${Date.now()}`, parents: [requisitoFolderId] })
              if(uploaded && uploaded.id){
                fields.push('drive_file_id = ?'); values.push(uploaded.id)
                fields.push('url_archivo = ?'); values.push(`drive://${uploaded.id}`)
                fileAction = existing.drive_file_id ? 'REPLACE' : 'UPLOAD'
              }
            }
          }else{
            // upload to root (no workspace folder)
            const filename = payload.nombre_archivo || existing.nombre_archivo || `evidence-${Date.now()}`
            const uploaded = await driveService.uploadBuffer({ buffer: buf, mimeType: mime, name: filename })
            if(uploaded && uploaded.id){
              fields.push('drive_file_id = ?'); values.push(uploaded.id)
              fields.push('url_archivo = ?'); values.push(`drive://${uploaded.id}`)
              fileAction = existing.drive_file_id ? 'REPLACE' : 'UPLOAD'
            }
          }
        }catch(err){
          console.error('update file to drive failed', err)
        }
      }
    }

    const changeDetails = []
    const isReplace = fileAction === 'REPLACE'
    if(Object.prototype.hasOwnProperty.call(payload, 'nombre_archivo') && payload.nombre_archivo !== existing.nombre_archivo){
      fields.push('nombre_archivo = ?'); values.push(payload.nombre_archivo)
      if(!isReplace){
        changeDetails.push(`Nombre: "${existing.nombre_archivo || ''}" → "${payload.nombre_archivo}"`)
      }
    }
    if(Object.prototype.hasOwnProperty.call(payload, 'comentario_evidencia')){
      fields.push('comentario_evidencia = ?'); values.push(payload.comentario_evidencia)
      if(payload.comentario_evidencia !== existing.comentario_evidencia){
        changeDetails.push(`Comentario: "${existing.comentario_evidencia || ''}" → "${payload.comentario_evidencia}"`)
      }
    }
    if(Object.prototype.hasOwnProperty.call(payload, 'estado_validacion_archivo')){
      fields.push('estado_validacion_archivo = ?'); values.push(payload.estado_validacion_archivo)
      if(payload.estado_validacion_archivo !== existing.estado_validacion_archivo){
        changeDetails.push(`Aprobación: ${existing.estado_validacion_archivo || 'N/A'} → ${payload.estado_validacion_archivo}`)
      }
    }
    if(fileAction){
      if(fileAction === 'REPLACE'){
        const oldName = existing.nombre_archivo || ''
        const newName = payload.nombre_archivo || existing.nombre_archivo || ''
        if(oldName && newName && oldName !== newName){
          changeDetails.push(`Archivo: ${oldName} → ${newName}`)
        } else {
          changeDetails.push(`Archivo reemplazado: ${newName}`)
        }
      } else {
        changeDetails.push(`Archivo ${fileAction.toLowerCase()}${payload.nombre_archivo ? `: ${payload.nombre_archivo}` : ''}`)
      }
    }

    if(fields.length===0) return res.status(400).json({ error: 'nothing_to_update' })
    values.push(id)
    await pool.query(`UPDATE EVIDENCIAS SET ${fields.join(', ')} WHERE id = ?`, values)

    // insert a summarized log entry with details of what changed
    try{
      const detail = changeDetails.filter(Boolean).join('\n') || `Actualización de evidencia ${existing.nombre_archivo || ''}`
      const actionType = fileAction || (Object.prototype.hasOwnProperty.call(payload, 'estado_validacion_archivo') ? 'APPROVAL' : 'UPDATE')
      await pool.query('INSERT INTO EVIDENCIAS_LOG (evidencia_id, usuario_id, ev_id, tipo_accion, nombre_archivo, detalle) VALUES (?,?,?,?,?,?)', [id, uid, existing.ev_id || null, actionType, existing.nombre_archivo || '', detail])
    }catch(err){ console.error('failed to insert evidencias log on update', err) }

    const [updated] = await pool.query('SELECT * FROM EVIDENCIAS WHERE id = ?', [id])
    // include force delete result for frontend feedback when applicable
    return res.json({ evidence: updated[0], forceDeleteResult })
  }catch(err){
    console.error('updateEvidence error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

async function deleteEvidence(req, res){
  const id = Number(req.params.id) || 0
  try{
    const lookup = await getEvidenceInWorkspace(id, req)
    if(lookup.error) return res.status(lookup.status).json({ error: lookup.error })
    const existing = lookup.evidence
    const role = req.user && req.user.role ? req.user.role : ''
    const uid = req.user && req.user.id ? req.user.id : null
    const canDelete = role === 'Admin' || _toNumber(existing.usuario_carga_id) === _toNumber(uid)
    if(!canDelete) return res.status(403).json({ error: 'forbidden' })
    // Insert delete log before removing the evidence row so history is preserved.
    try{
      await pool.query('INSERT INTO EVIDENCIAS_LOG (evidencia_id, usuario_id, ev_id, tipo_accion, nombre_archivo, detalle) VALUES (?,?,?,?,?,?)', [id, uid, existing.ev_id || null, 'DELETE', existing.nombre_archivo || '', `Evidencia eliminada: ${existing.nombre_archivo || ''}`])
    }catch(err){ console.error('failed to insert evidencias log on delete', err) }
    // delete DB row
    await pool.query('DELETE FROM EVIDENCIAS WHERE id = ?', [id])
    // if file stored on Drive, attempt to delete from Drive (best-effort)
    try{
      if(existing.drive_file_id){
        await driveService.deleteFile(existing.drive_file_id)
      }
    }catch(err){
      console.error('failed to delete file from drive', err)
    }
    return res.json({ ok: true })
  }catch(err){
    console.error('deleteEvidence error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

// Return history/logs for a given evidence id
async function getEvidenceHistory(req, res){
  const id = Number(req.params.id) || 0
  try{
    if(!id) return res.status(400).json({ error: 'invalid_evidence_id' })
    const user = req.user || {}
    if(!user.id && user.role !== 'Admin'){
      return res.status(401).json({ error: 'unauthorized' })
    }

    const normalizeRows = (result) => {
      if(Array.isArray(result)){
        if(result.length === 0) return []
        if(Array.isArray(result[0])) return result[0]
        return result
      }
      return []
    }

    const lookup = await getEvidenceInWorkspace(id, req)
    if(lookup.error){
      if(lookup.status !== 404){
        return res.status(lookup.status).json({ error: lookup.error })
      }

      const userId = req.user && req.user.id ? Number(req.user.id) : null
      const workspaceId = resolveWorkspaceId(req)
      const isAdmin = req.user && req.user.role === 'Admin'
      const [deletedEvidenceLogRows] = await pool.query(`
        SELECT l.usuario_id, u.workspace_id
        FROM EVIDENCIAS_LOG l
        LEFT JOIN USUARIOS u ON u.id = l.usuario_id
        WHERE l.evidencia_id = ?
        ORDER BY l.fecha_accion DESC
        LIMIT 5
      `, [id])
      const hasAuditTrail = Array.isArray(deletedEvidenceLogRows) && deletedEvidenceLogRows.length > 0
      const canAccessDeletedHistory = hasAuditTrail && (isAdmin || (userId != null && deletedEvidenceLogRows.some((row) => Number(row.usuario_id) === userId || (workspaceId != null && Number(row.workspace_id) === workspaceId))))
      if(!canAccessDeletedHistory){
        return res.status(404).json({ error: 'not_found' })
      }
    }

    const rows = normalizeRows(await pool.query(`
      SELECT l.*, u.nombre as usuario_nombre, e.estado_validacion_archivo
      FROM EVIDENCIAS_LOG l
      LEFT JOIN USUARIOS u ON u.id = l.usuario_id
      LEFT JOIN EVIDENCIAS e ON e.id = l.evidencia_id
      WHERE l.evidencia_id = ?
      ORDER BY l.fecha_accion DESC
    `, [id]))

    // If there is no log row and the evidence row is gone, return an empty history instead of failing.
    if(!rows || rows.length === 0){
      const existing = normalizeRows(await pool.query('SELECT id FROM EVIDENCIAS WHERE id = ?', [id]))
      if(!existing || existing.length === 0){
        return res.json({ logs: [] })
      }
    }

    // Attempt robust normalization for common mojibake patterns.
    // Strategy: if string contains typical mojibake markers (Ã), try interpreting
    // the original bytes as latin1 and convert to utf8. Fallback to binary->utf8.
    const fix = (v) => {
      if(v === null || v === undefined) return v
      const s = String(v)
      try{
        if(/Ã/.test(s)){
          // try latin1 -> utf8
          const fromLatin1 = Buffer.from(s, 'latin1').toString('utf8')
          if(!/Ã/.test(fromLatin1)) return fromLatin1
          // fallback to binary->utf8
          const fromBinary = Buffer.from(s, 'binary').toString('utf8')
          if(!/Ã/.test(fromBinary)) return fromBinary
        }
      }catch(e){ /* ignore */ }
      return s
    }
    const fixed = rows.map(r => ({ ...r,
      nombre_archivo: fix(r.nombre_archivo),
      detalle: fix(r.detalle),
      usuario_nombre: fix(r.usuario_nombre)
    }))
    return res.json({ logs: fixed })
  }catch(err){
    console.error('getEvidenceHistory error', err)
    return res.status(500).json({ error: 'internal_error' })
  }
}

module.exports = { listByRequisito, createEvidence, updateEvidence, deleteEvidence, downloadEvidence, getEvidenceHistory, getEvidenceInWorkspace }


      // Is "matches" a boolean that indicates whether the pattern was matched?
      // A: Well, in JavaScript, the `match` method returns an array of matches if the pattern is found, or `null` if it is not.
      // So `matches` itself is not a boolean, but you can check if it is truthy to determine if the pattern was matched. If `matches`
      // is not `null`, it means the pattern was matched and you can access the captured groups through the array. For example, 
      // `matches[1]` would give you the MIME type and `matches[2]` would give you the base64 data if the pattern was matched successfully.

      // what is MIME type?
      // MIME type is a standard way of describing the format of a file. It consists of a type
      // and a subtype, separated by a slash. For example, "image/jpeg" is a MIME type where 
      // "image" is the type and "jpeg" is the subtype. The MIME type helps the system understand
      // the format of the file and how to handle the file, such as how to display it or which application to use to open it.
