import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'
import fetchWithAuth from '../lib/api'
import NavBarISO from '../components/NavBarISO'
import ChatPlaceholder from '../components/ChatPlaceholder'
import ConfirmDialog from '../components/ConfirmDialog'
import { hasRole } from '../lib/userUtils'

function UploadArea({ evaluacionId, onUploaded }){
  const [dragOver, setDragOver] = React.useState(false)
  const fileRef = React.useRef(null)
  const { user } = useAuth()

  const handleFiles = async (files) => {
    if(!files || files.length===0) return
    const file = files[0]
    const nombre = file.name
    // ext: lowercase file extension without 
    // dot, or empty string if no extension
    const ext = (nombre.split('.').pop() || '').toLowerCase()
    // read file as data URL to send to backend for storage
    try{
      const readAsDataURL = (f) => new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result) // result will be a data URL like "data:image/png;base64,...."
        fr.onerror = reject // reject with the error event if reading fails
        fr.readAsDataURL(f) // start reading the file as data URL
      })
      const fileData = await readAsDataURL(file)
      // payload contains evaluacionId (nullable), nombre, ext, and fileData as data URL
      // does fileData contain the full pdf or image or whatever it is?
      // Yes, fileData will contain the full content of the file encoded as a data URL. For example, 
      // if you upload an image, fileData will be a string that starts with something like "data:image/png;base64," followed by \
      // the base64-encoded content of the image. The backend can then decode this data URL to retrieve the original file content
      // and store it for storage or processing.
      const payload = { evaluacion_requisito_id: evaluacionId || null, nombre_archivo: nombre, tipo_formato: ext, fileData }
      
      const res = await fetchWithAuth('/api/evidencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if(!res.ok){ const j = await res.json().catch(()=>({})); alert('Error subiendo evidencia: ' + (j.error || res.statusText)); return }
      const created = await res.json()
      // ensure uploader id present for frontend; backend should set it but fallback
      if((created.usuario_carga_id === null || created.usuario_carga_id === undefined) && user && user.id){
        created.usuario_carga_id = user.id
      }
      // create object URL only if backend did not return a URL and file available
      if(!created.url_archivo && file && typeof URL !== 'undefined' && URL.createObjectURL){
        created.url_archivo = URL.createObjectURL(file)
        created._localObjectUrl = true
      }
      if(onUploaded) onUploaded(created)
      try{ window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Evidencia subida', message: nombre, type: 'success', ttl: 4000 } })) }catch(_){ }
    }catch(e){ console.error('upload error', e); alert('Error subiendo archivo') }
  }

  return (
    <div>
      <div
        onDragOver={e=>{ e.preventDefault(); setDragOver(true) }}
        onDragLeave={e=>{ e.preventDefault(); setDragOver(false) }}
        onDrop={e=>{ e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={`p-3 mb-3 border-dashed border-2 rounded ${dragOver ? 'border-[#00236f] bg-slate-50' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Arrastra archivos aquí para subir</div>
            <div className="text-xs text-slate-500">O usa el botón para seleccionar un archivo</div>
          </div>
          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={e=> handleFiles(e.target.files)} />
            <button onClick={()=>fileRef.current && fileRef.current.click()} className="px-3 py-2 bg-[#00236f] text-white rounded">Seleccionar archivo</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RequirementContent({ node }){
  const navigate = useNavigate()
  const { user } = useAuth()
  const [evidences, setEvidences] = useState([])
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [blobUrls, setBlobUrls] = useState({})
  const blobUrlsRef = React.useRef({})

  // keep ref in sync for cleanup on unmount
  useEffect(()=>{ blobUrlsRef.current = blobUrls },[blobUrls])

  // revoke any created object URLs on unmount
  useEffect(()=>{
    return ()=>{
      try{ Object.values(blobUrlsRef.current || {}).forEach(u=>{ try{ URL.revokeObjectURL(u) }catch(_){} }) }catch(_){}
    }
  },[])
  const [modalComment, setModalComment] = useState('')
  const [ncList, setNcList] = useState([])
  const [evaluacionId, setEvaluacionId] = useState(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyLogs, setHistoryLogs] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize] = useState(8)
  const [historyFilterStatus, setHistoryFilterStatus] = useState('')
  const [historyFilterEstado, setHistoryFilterEstado] = useState('')
  const [historyFilterFrom, setHistoryFilterFrom] = useState('')
  const [historyFilterTo, setHistoryFilterTo] = useState('')
  useEffect(()=>{
    // mounted will be used for cancellation in case the 
    // component unmounts before the fetch completes

    // why would the componente unmount? what component?

    // The RequirementView component that uses RequirementContent
    // may unmount if the user navigates away before the fetch completes.
    let mounted = true
    async function loadEvidences(){
      try{
        const res = await fetchWithAuth(`/api/evidencias/requisito/${node.id}`)
        if(!mounted) return
        if(!res.ok) return
        const json = await res.json()
        setEvidences(json.evidencias || [])
      }catch(e){ console.error('load evidences', e) }
    }
    if(node && node.id) loadEvidences()
    return ()=> mounted = false
  },[node])

  // Fetch protected image previews for evidences that reference Drive
  useEffect(()=>{
    let mounted = true
    const toFetch = (evidences || []).filter(ev => ev && ev.url_archivo && ev.url_archivo.startsWith('drive://') && (/\.(jpe?g|png|gif|webp)$/i).test(ev.nombre_archivo))
    toFetch.forEach(ev => {
      // skip if already cached
      if(blobUrls[ev.id]) return
      (async ()=>{
        try{
          const res = await fetchWithAuth(`/api/evidencias/${ev.id}/download?inline=1`)
          if(!mounted) return
          if(!res.ok) return
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          if(!mounted) return
          setBlobUrls(prev => ({ ...prev, [ev.id]: url }))
        }catch(e){ console.error('preview fetch error', e) }
      })()
    })
    return ()=>{ mounted = false }
  },[evidences])

  // load evaluacion id and NCs for this requisito
  useEffect(()=>{
    let mounted = true
    async function loadNCs(){
      if(!node || !node.id) return
      try{
        const r = await fetchWithAuth(`/api/evaluaciones/requisito/${node.id}`)
        if(!r.ok) return
        const json = await r.json()
        const evId = json.id
        if(!mounted) return
        setEvaluacionId(evId)
        const ncr = await fetchWithAuth(`/api/nc/evaluacion/${evId}`)
        if(!ncr.ok) return
        const list = await ncr.json()
        if(!mounted) return
        try{ if(typeof setNcList === 'function') setNcList(list || []) }catch(e){ console.error('setNcList error', e) }
        // clear unread notifications related to this requisito (delete in DB)
        (async ()=>{
          try{
            const resp = await fetchWithAuth(`/api/notifications/for-requisito/${node.id}/clear`, { method: 'POST' })
            if(resp && resp.ok){
              try{ window.dispatchEvent(new CustomEvent('notifications:cleared', { detail: { requisitoId: Number(node.id) } })) }catch(_){ }
            }
          }catch(e){ console.error('clear notifications for requisito error', e) }
        })()
      }catch(e){ console.error('load NCs', e) }
    }
    loadNCs()
    // refresh on global event when NC created
    const handler = (e) => {
      const detail = e.detail || {}
      if(detail.requisito_base_id == node.id){
        // re-run loadNCs
        loadNCs()
      }
    }
    window.addEventListener('nc:created', handler)
    return ()=>{ mounted = false; window.removeEventListener('nc:created', handler) }
  },[node])

  // modal comment sync when selected evidence changes
  useEffect(()=>{
    if(selectedEvidence){
      setModalComment(selectedEvidence.comentario_evidencia || '')
    }
  },[selectedEvidence])

  const closeEvidence = () => setSelectedEvidence(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmCallback, setConfirmCallback] = useState(null)

  // For updating an evidence file: keep a hidden input and a pending selection
  const updateFileRef = React.useRef(null)
  const [pendingUpdateEv, setPendingUpdateEv] = useState(null)
  const [pendingUpdateFile, setPendingUpdateFile] = useState(null)

  // create a hidden file input once (rendered later) and handle its change to open confirm
  const onUpdateFileChosen = async (e)=>{
    const file = e.target.files && e.target.files[0]
    if(!file) return
    setPendingUpdateFile(file)
    setConfirmTitle('Reemplazar archivo')
    setConfirmMessage('Se eliminará el archivo actual en Drive y se subirá el nuevo. ¿Continuar?')
    setConfirmCallback(()=>async ()=>{
      const ev = pendingUpdateEv
      const fileLocal = file
      try{
        const readAsDataURL = (f) => new Promise((resolve, reject) => {
          const fr = new FileReader()
          fr.onload = () => resolve(fr.result)
          fr.onerror = reject
          fr.readAsDataURL(f)
        })
        const fileData = await readAsDataURL(fileLocal)
        const payload = { fileData, nombre_archivo: fileLocal.name, tipo_formato: (fileLocal.name.split('.').pop()||'').toLowerCase(), force_delete_before_upload: true }
        const res = await fetchWithAuth(`/api/evidencias/${ev.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if(!res.ok){ const j = await res.json().catch(()=>({})); window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'No se pudo actualizar evidencia: ' + (j.error || res.statusText), type: 'error', ttl: 6000 } })); return }
        const json = await res.json()
        const updated = json && json.evidence ? json.evidence : json
        const fd = json && json.forceDeleteResult ? json.forceDeleteResult : null
        if(fd){
          if(fd.ok) window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Eliminado', message: `Archivo anterior eliminado.`, type: 'info', ttl: 2500 } }))
          else window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Advertencia', message: `No se pudo eliminar archivo anterior: ${fd.error}`, type: 'warning', ttl: 5000 } }))
        }
        if(updated){
          setEvidences(prev => prev.map(x => x.id===ev.id ? { ...x, ...updated } : x))
          try{
            const isImage = (/\.(jpe?g|png|gif|webp)$/i).test(updated.nombre_archivo || fileLocal.name)
            if(blobUrls && blobUrls[ev.id]){ try{ URL.revokeObjectURL(blobUrls[ev.id]) }catch(_){ } setBlobUrls(prev => { const next = { ...prev }; delete next[ev.id]; return next }) }
            if(isImage && updated.url_archivo && String(updated.url_archivo).startsWith('drive://')){
              (async ()=>{
                try{
                  const r = await fetchWithAuth(`/api/evidencias/${ev.id}/download?inline=1`)
                  if(r.ok){
                    const b = await r.blob()
                    const newUrl = URL.createObjectURL(b)
                    setBlobUrls(prev => ({ ...prev, [ev.id]: newUrl }))
                  }
                }catch(e){ console.error('refresh preview error', e) }
              })()
            }
          }catch(e){ console.error('preview refresh', e) }
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Evidencia actualizada', message: updated.nombre_archivo || fileLocal.name, type: 'success', ttl: 3500 } }))
        }else{
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Actualización fallida', type: 'error', ttl: 5000 } }))
        }
      }catch(err){ console.error('update evidence', err); window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error actualizando evidencia', type: 'error', ttl: 5000 } })) }
    })
    setConfirmOpen(true)
  }

  // Request to start update: set pending ev and trigger hidden input click
  const requestUpdateEvidence = (ev) => {
    setPendingUpdateEv(ev)
    if(!updateFileRef.current){
      // create a temporary input if not yet rendered
      const inp = document.createElement('input')
      inp.type = 'file'
      inp.onchange = onUpdateFileChosen
      inp.click()
    }else{
      updateFileRef.current.value = null
      updateFileRef.current.click()
    }
  }
  const saveEvidenceComment = (id, comment) => {
    (async ()=>{
      try{
        const res = await fetchWithAuth(`/api/evidencias/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentario_evidencia: comment }) })
        if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo guardar: ' + (j.error || res.statusText)); return }
        const updated = await res.json()
        setEvidences(prev => prev.map(e => e.id === id ? { ...e, comentario_evidencia: updated.comentario_evidencia } : e))
        closeEvidence()
      }catch(e){ console.error('save comment', e); alert('Error guardando comentario') }
    })()
  }
  if(!node) return <div className="p-4">No encontrado</div>
  const children = node.children || []

  // history filtering + pagination derived values
  const filteredHistory = (historyLogs || []).filter(l => {
    let ok = true
    if(historyFilterStatus) ok = ok && l.tipo_accion === historyFilterStatus
    if(historyFilterEstado) ok = ok && (l.estado_validacion_archivo || '') === historyFilterEstado
    if(historyFilterFrom){ const d = new Date(l.fecha_accion).toISOString().slice(0,10); ok = ok && d >= historyFilterFrom }
    if(historyFilterTo){ const d = new Date(l.fecha_accion).toISOString().slice(0,10); ok = ok && d <= historyFilterTo }
    return ok
  })
  const historyTotal = filteredHistory.length
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize))
  const historyPageItems = filteredHistory.slice((historyPage-1)*historyPageSize, historyPage*historyPageSize)

  const ACTION_LABELS = {
    UPLOAD: 'Subida',
    DELETE: 'Eliminación',
    UPDATE: 'Actualización',
    REPLACE: 'Reemplazo',
    APPROVAL: 'Aprobación',
    BULK_DELETE: 'Eliminación masiva'
  }

  return (
    <div className="p-4">
      <div className="mt-2">
        {children && children.length>0 ? (
          <>
            <h3 className="text-lg font-semibold mb-1">Subrequisitos</h3>
            <div className="flex flex-wrap gap-1">
              {children.map(c=> (
                <button key={c.id} onClick={()=>navigate(`/requisitos/${c.id}`)} className="text-sm px-3 py-1 border rounded bg-white shadow-sm hover:bg-slate-50">
                  {c.descripcion_normativa}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">No hay subrequisitos asociados.</p>
        )}
        {/* File storage area (placeholders) above evaluation area */}
        <div className="mt-3 p-3 border rounded bg-white">
          <h5 className="text-sm font-medium mb-2">Archivos</h5>
          {/* Upload area */}
          <UploadArea evaluacionId={evaluacionId} onUploaded={(newEv)=> setEvidences(prev => [newEv, ...prev])} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {evidences && evidences.length>0 ? evidences.map(ev => {
              const isImage = /\.(jpe?g|png|gif|webp)$/i.test(ev.nombre_archivo)
              const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%234a5568'>${ev.nombre_archivo}</text></svg>`
              const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
              const status = ev.estado_validacion_archivo || 'Pendiente'
              const statusColor = status === 'Aceptado' ? 'bg-green-600 text-white' : (status === 'Rechazado' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white')
              // compute image src: prefer URL from backend; if it's a server-relative uploads path, prefix backend origin
              const computeSrc = (url) => {
                if(!url) return null
                if(url.startsWith('http')) return url
                if(url.startsWith('/uploads')) return `${window.location.protocol}//${window.location.hostname}:3000${url}`
                return url
              }

              return (
                <div key={ev.id} className="relative aspect-square p-2 border rounded flex flex-col items-center justify-between" >
                      {/* Delete X for responsables (simulated) */}
                      {user && user.id === ev.usuario_carga_id && hasRole(user,'responsable') && (
                    <button
                      onClick={()=>{
                        setConfirmTitle('Eliminar evidencia')
                        setConfirmMessage('¿Confirmar eliminación de la evidencia? Esta acción no se puede deshacer.')
                        setConfirmCallback(()=>async ()=>{
                          try{
                            const res = await fetchWithAuth(`/api/evidencias/${ev.id}`, { method: 'DELETE' })
                            if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo eliminar: ' + (j.error || res.statusText)); return }
                            try{ 
                              if(ev && ev._localObjectUrl && ev.url_archivo && ev.url_archivo.startsWith('blob:')) URL.revokeObjectURL(ev.url_archivo)
                              if(blobUrls && blobUrls[ev.id]){ try{ URL.revokeObjectURL(blobUrls[ev.id]) }catch(_){ } setBlobUrls(prev => { const next = { ...prev }; delete next[ev.id]; return next }) }
                            }catch(_){ }
                            setEvidences(prev => prev.filter(x => x.id !== ev.id))
                          }catch(e){ console.error('delete evidence', e); alert('Error eliminando evidencia') }
                        })
                        setConfirmOpen(true)
                      }}
                      className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs"
                      style={{zIndex:30}}
                      aria-label="Eliminar evidencia"
                    >
                      ×
                    </button>
                  )}
                  <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded shadow-sm " style={{zIndex:20}}>
                    <span className={`${statusColor} px-2 py-1 rounded text-xs`}>{status}</span>
                  </div>
                  <div className="w-full h-full flex flex-col items-center justify-between">
                    <div className="w-full h-0 flex-1 flex items-center justify-center overflow-hidden rounded bg-slate-50">
                      <div className="w-full h-full flex items-center justify-center">
                        {isImage ? (
                            // If url_archivo is a drive reference, use authenticated blob URL cached in state
                            <img src={ev.url_archivo && ev.url_archivo.startsWith('drive://') ? (blobUrls[ev.id] || dataUrl) : (computeSrc(ev.url_archivo) || dataUrl)} alt={ev.nombre_archivo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center text-sm text-slate-600">{ev.nombre_archivo.split('.').pop().toUpperCase()}</div>
                          )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-center truncate w-full px-1">{ev.nombre_archivo}</div>
                      <div className="mt-2 flex gap-2 justify-center items-center">
                      <button onClick={async ()=>{
                        // Ensure blob preview is available for drive:// files before opening modal
                        try{
                          if(ev.url_archivo && String(ev.url_archivo).startsWith('drive://') && !blobUrls[ev.id]){
                            const r = await fetchWithAuth(`/api/evidencias/${ev.id}/download?inline=1`)
                            if(r.ok){
                              const b = await r.blob()
                              const u = URL.createObjectURL(b)
                              setBlobUrls(prev => ({ ...prev, [ev.id]: u }))
                            }
                          }
                        }catch(e){ console.error('on open preview fetch error', e) }
                        setSelectedEvidence(ev)
                      }} className="text-xs px-2 py-1 border rounded bg-white">Abrir</button>
                      <button onClick={async ()=>{
                        try{
                          const res = await fetchWithAuth(`/api/evidencias/${ev.id}/history`)
                          if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo obtener historial: ' + (j.error || res.statusText)); return }
                          const json = await res.json()
                          const logs = (json.logs || [])
                          setHistoryLogs(logs)
                          setHistoryPage(1)
                          setHistoryFilterFrom('')
                          setHistoryFilterTo('')
                          setHistoryFilterStatus('')
                          setHistoryModalOpen(true)
                        }catch(e){ console.error('historial error', e); alert('Error obteniendo historial') }
                      }} className="text-xs px-2 py-1 border rounded bg-white">Historial</button>
                      <button onClick={async ()=>{
                        // Trigger download via backend to avoid drive:// scheme
                        try{
                          const res = await fetchWithAuth(`/api/evidencias/${ev.id}/download`)
                          if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo descargar: ' + (j.error || res.statusText)); return }
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = ev.nombre_archivo || 'evidencia'
                          document.body.appendChild(a)
                          a.click()
                          a.remove()
                          URL.revokeObjectURL(url)
                        }catch(e){ console.error('download error', e); alert('Error descargando evidencia') }
                      }} className="text-xs px-2 py-1 border rounded bg-white">Descargar</button>
                      {/* Actualizar visible solo para responsables (simulado) */}
                      {hasRole(user,'responsable') && (
                        <button onClick={()=>requestUpdateEvidence(ev)} className="text-xs px-2 py-1 border rounded bg-[#00236f] text-white">Actualizar</button>
                      )}
                      {/* Evaluador puede cambiar estado (simulado) */}
                      {hasRole(user,'evaluador') && (
                        <select
                          value={ev.estado_validacion_archivo || 'Pendiente'}
                          onChange={async (e)=>{
                            const newVal = e.target.value
                            // optimistic UI update
                            setEvidences(prev => prev.map(x => x.id===ev.id ? { ...x, estado_validacion_archivo: newVal } : x))
                            try{
                              const res = await fetchWithAuth(`/api/evidencias/${ev.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado_validacion_archivo: newVal }) })
                              if(!res.ok){ const j = await res.json().catch(()=>({})); window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'No se pudo cambiar estado: ' + (j.message || j.error || res.statusText), type: 'error', ttl: 6000 } })); return }
                              const json = await res.json()
                              // backend returns updated evidence or wrapped object; try to extract
                              const updated = json && json.evidence ? json.evidence : (json || {})
                              setEvidences(prev => prev.map(x => x.id===ev.id ? { ...x, estado_validacion_archivo: updated.estado_validacion_archivo || newVal } : x))
                              window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Estado actualizado', message: `Evidencia ${ev.id}: ${newVal}`, type: 'success', ttl: 3000 } }))
                            }catch(err){ console.error('change estado', err); window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error cambiando estado', type: 'error', ttl: 5000 } })) }
                          }}
                          className="text-xs px-2 py-1 border rounded bg-white"
                        >
                          <option>Pendiente</option>
                          <option>Aceptado</option>
                          <option>Rechazado</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="text-sm text-slate-500">No hay evidencias cargadas.</div>
            )}
          </div>
        </div>

        {/* History modal */}
        {historyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded p-4 max-w-3xl w-full mx-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Historial de evidencia</h3>
                <div className="flex gap-2 items-center">
                  <button onClick={()=>setHistoryModalOpen(false)} className="px-3 py-1 border rounded">Cerrar</button>
                </div>
              </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-xs">Desde</label>
                  <input type="date" value={historyFilterFrom} onChange={e=>{ setHistoryFilterFrom(e.target.value); setHistoryPage(1) }} className="w-full p-1 border rounded" />
                </div>
                <div>
                  <label className="text-xs">Hasta</label>
                  <input type="date" value={historyFilterTo} onChange={e=>{ setHistoryFilterTo(e.target.value); setHistoryPage(1) }} className="w-full p-1 border rounded" />
                </div>
                <div>
                  <label className="text-xs">Tipo</label>
                  <select value={historyFilterStatus} onChange={e=>{ setHistoryFilterStatus(e.target.value); setHistoryPage(1) }} className="w-full p-1 border rounded">
                    <option value="">(Todos)</option>
                    <option value="UPLOAD">{ACTION_LABELS.UPLOAD}</option>
                    <option value="DELETE">{ACTION_LABELS.DELETE}</option>
                    <option value="UPDATE">{ACTION_LABELS.UPDATE}</option>
                    <option value="REPLACE">{ACTION_LABELS.REPLACE}</option>
                    <option value="APPROVAL">{ACTION_LABELS.APPROVAL}</option>
                    <option value="BULK_DELETE">{ACTION_LABELS.BULK_DELETE}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs">Estado aprob.</label>
                  <select value={historyFilterEstado} onChange={e=>{ setHistoryFilterEstado(e.target.value); setHistoryPage(1) }} className="w-full p-1 border rounded">
                    <option value="">(Todos)</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aceptado">Aceptado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-2 py-1 border-b">Fecha</th>
                      <th className="px-2 py-1 border-b">Usuario</th>
                      <th className="px-2 py-1 border-b">Tipo</th>
                      <th className="px-2 py-1 border-b">Estado</th>
                      <th className="px-2 py-1 border-b">Archivo</th>
                      <th className="px-2 py-1 border-b">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyPageItems.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="px-2 py-1 border-b">{new Date(h.fecha_accion).toLocaleString()}</td>
                        <td className="px-2 py-1 border-b">{h.usuario_nombre}</td>
                        <td className="px-2 py-1 border-b">{ACTION_LABELS[h.tipo_accion] || h.tipo_accion}</td>
                        <td className="px-2 py-1 border-b">{h.estado_validacion_archivo || '—'}</td>
                        <td className="px-2 py-1 border-b">{h.nombre_archivo}</td>
                        <td className="px-2 py-1 border-b">{h.detalle}</td>
                      </tr>
                    ))}
                    {historyPageItems.length===0 && (
                      <tr><td className="px-2 py-4 border-b text-sm text-slate-500" colSpan={5}>No hay registros.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-600">Registros: {historyTotal}</div>
                <div className="flex items-center gap-2">
                  <button disabled={historyPage<=1} onClick={()=>setHistoryPage(p=>Math.max(1,p-1))} className="px-2 py-1 border rounded">Anterior</button>
                  <div className="text-sm">Página {historyPage} / {historyTotalPages}</div>
                  <button disabled={historyPage>=historyTotalPages} onClick={()=>setHistoryPage(p=>Math.min(historyTotalPages,p+1))} className="px-2 py-1 border rounded">Siguiente</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Evaluation area / No Conformidades area */}
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">{hasRole(user,'responsable') ? 'No Conformidades' : 'Área de evaluación'}</h4>
          <p className="text-sm text-slate-500">{hasRole(user,'responsable') ? 'Espacio para gestionar NC y sus estados' : 'Espacio para marcar evidencias, ver lista de NCs y estado del requisito.'}</p>
          <div className="mt-3">
            {!hasRole(user,'responsable') && (
              <button onClick={async ()=>{
                // lazy-load responsables and open modal via global event
                try{
                  const res = await fetchWithAuth('/api/users/responsables')
                  if(res.ok){
                    const list = await res.json()
                    window.dispatchEvent(new CustomEvent('nc:open', { detail: { responsables: list, requisito_base_id: node.id } }))
                  }else{
                    window.dispatchEvent(new CustomEvent('nc:open', { detail: { responsables: [], requisito_base_id: node.id } }))
                  }
                }catch(e){ window.dispatchEvent(new CustomEvent('nc:open', { detail: { responsables: [], requisito_base_id: node.id } })) }
              }} className="mt-2 px-3 py-2 bg-red-600 text-white rounded">Crear NC</button>
            )}
          </div>
        </div>

        {/* NCs expanded list (loaded from backend) */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">No conformidades</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2 border-b">ID</th>
                  <th className="px-3 py-2 border-b">Nombre</th>
                  <th className="px-3 py-2 border-b">Estado flujo</th>
                  <th className="px-3 py-2 border-b">Validación</th>
                  <th className="px-3 py-2 border-b">Fecha verificación</th>
                  <th className="px-3 py-2 border-b">Comentario</th>
                  <th className="px-3 py-2 border-b">Última edición</th>
                  <th className="px-3 py-2 border-b">Abrir NC</th>
                </tr>
              </thead>
              <tbody>
                {(ncList || []).map(nc => (
                  <tr key={nc.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 border-b"><a onClick={()=>navigate(`/nc/${nc.id}`)} className="text-blue-600 hover:underline cursor-pointer">{nc.id}</a></td>
                    <td className="px-3 py-2 border-b">{nc.titulo || nc.nombre || '—'}</td>
                    <td className="px-3 py-2 border-b">{nc.estado_flujo}</td>
                    <td className="px-3 py-2 border-b">{nc.estado_validacion}</td>
                    <td className="px-3 py-2 border-b">{nc.fecha_verificacion_eficacia}</td>
                    <td className="px-3 py-2 border-b">{nc.comentario_nc}</td>
                    <td className="px-3 py-2 border-b">{nc.fecha_ultima_edicion}</td>
                    <td className="px-3 py-2 border-b"><button onClick={()=>navigate(`/nc/${nc.id}`)} className="text-sm px-2 py-1 bg-[#00236f] text-white rounded">Abrir NC</button></td>
                  </tr>
                ))}
                {(!ncList || ncList.length===0) && (
                  <tr><td className="px-3 py-4 border-b text-sm text-slate-500" colSpan={8}>No hay No Conformidades registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chat placeholder debajo de la tabla de NC */}
        <ChatPlaceholder />
        {/* Evidence modal (simulated) */}
        {selectedEvidence && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded p-4 max-w-3xl w-full">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold">{selectedEvidence.nombre_archivo}</h3>
                <button onClick={()=>setSelectedEvidence(null)} className="text-sm px-2 py-1">Cerrar</button>
              </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded overflow-hidden flex items-center justify-center">
                  {(() => {
                    const isImage = (/\.(jpe?g|png|gif|webp)$/i).test(selectedEvidence.nombre_archivo)
                    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%234a5568'>${selectedEvidence.nombre_archivo}</text></svg>`
                    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
                    if(isImage){
                      let src = dataUrl
                      if(selectedEvidence.url_archivo){
                        if(selectedEvidence.url_archivo.startsWith('drive://')){
                          src = blobUrls[selectedEvidence.id] || dataUrl
                        }else if(selectedEvidence.url_archivo.startsWith('http')){
                          src = selectedEvidence.url_archivo
                        }else if(selectedEvidence.url_archivo.startsWith('/uploads')){
                          src = `${window.location.protocol}//${window.location.hostname}:3000${selectedEvidence.url_archivo}`
                        }
                      }
                      return <img src={src} alt={selectedEvidence.nombre_archivo} className="max-h-96 object-contain" />
                    }
                    return <div className="p-6 text-sm text-slate-600">Archivo: {selectedEvidence.nombre_archivo}</div>
                  })()}
                </div>
                <div>
                  <div className="text-sm text-slate-500">Comentario de la evidencia</div>
                  {hasRole(user,'responsable') ? (
                    <>
                      <textarea value={modalComment} onChange={e=>setModalComment(e.target.value)} className="w-full h-40 p-2 border rounded mt-2" />
                      <div className="mt-2 flex gap-2 justify-end">
                        <button onClick={()=>{ saveEvidenceComment(selectedEvidence.id, modalComment) }} className="px-3 py-1 bg-[#00236f] text-white rounded">Guardar</button>
                        <button onClick={()=>setSelectedEvidence(null)} className="px-3 py-1 border rounded">Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 p-2 border rounded bg-slate-50">{selectedEvidence.comentario_evidencia || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Hidden input for update-file flow and confirm dialog */}
        <input ref={updateFileRef} type="file" className="hidden" onChange={onUpdateFileChosen} />
        <ConfirmDialog open={confirmOpen} title={confirmTitle} message={confirmMessage} confirmText="Confirmar" cancelText="Cancelar" onConfirm={async ()=>{ setConfirmOpen(false); try{ if(confirmCallback) await confirmCallback(); }catch(e){ console.error('confirm callback error', e) } finally{ setConfirmCallback(null); setPendingUpdateEv(null); setPendingUpdateFile(null) } }} onCancel={()=>{ setConfirmOpen(false); setConfirmCallback(null); setPendingUpdateEv(null); setPendingUpdateFile(null) }} />
      </div>
    </div>
  )
}

export default function RequirementView(){
  const { id } = useParams()
  const { accessToken, user } = useAuth()
  const [node, setNode] = useState(null)
  const [loading, setLoading] = useState(true)


  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        // Prefer fetchWithAuth wrapper which adds auth headers and refresh logic
        // 1) find an ISO to request the full tree for (choose first ISO)
        const isosRes = await fetchWithAuth('/api/isos')
        if(!mounted) return
        if(!isosRes.ok){ setNode(null); return }
        const isos = await isosRes.json()
        const isoId = isos && isos.length ? isos[0].id : null
        if(!isoId){ setNode(null); return }

        // 2) fetch the full ISO tree (clauses + nested requisitos + requisitosMap)
        const treeRes = await fetchWithAuth(`/api/isos/${isoId}/tree`)
        if(!mounted) return
        if(!treeRes.ok){ setNode(null); return }
        const tree = await treeRes.json()

        // tree: { iso, clauses }
        // find the clause that contains the requisito by checking requisitosMap on each clause
        const { clauses } = tree || {}
        let found = null
        if(Array.isArray(clauses)){
          for(const clause of clauses){
            const map = clause.requisitosMap || {}
            // map keys are strings after JSON serialization; use id as string
            if(map[String(id)]){ found = { requisito: map[String(id)], clause }; break }
          }
        }
        setNode(found)
      }catch(e){ setNode(null) }
      finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  },[id, accessToken])


  // node is { requisito, clause }
  const requisito = node ? node.requisito : null
  const clause = node ? node.clause : null
  // prefer requisito.number + name; fallback to clause
  const titleText = requisito && requisito.number && requisito.name ? `${requisito.number} ${requisito.name}` : (clause ? `${clause.numero_clausula} ${clause.titulo}` : (requisito ? `Requisito ${requisito.id}` : 'Requisito'))

  // NC modal state and handlers (listens to global 'nc:open' event)
  const [ncModalOpen, setNcModalOpen] = useState(false)
  const [ncModalData, setNcModalData] = useState({ requisito_base_id: null, responsables: [], titulo: '', descripcion: '' })

  useEffect(()=>{
    const handler = (e) => {
      const detail = e.detail || {}
      const reps = (detail.responsables || []).map(r => ({ ...r, selected: false }))
      setNcModalData({ requisito_base_id: detail.requisito_base_id || (requisito && requisito.id), responsables: reps, titulo: '', descripcion: '' })
      setNcModalOpen(true)
    }
    window.addEventListener('nc:open', handler)
    return ()=> window.removeEventListener('nc:open', handler)
  },[requisito])

  async function submitNC(){
    try{
      const payload = {
        requisito_base_id: ncModalData.requisito_base_id,
        titulo: ncModalData.titulo,
        descripcion: ncModalData.descripcion,
        responsables: ncModalData.responsables.filter(r=>r.selected).map(r=>r.id)
      }
      const res = await fetchWithAuth('/api/nc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if(!res.ok){ const err = await res.json(); alert('Error creando NC: ' + (err.error || JSON.stringify(err))); return }
      const json = await res.json()
      // notify sidebar and show toast, then close modal
      window.dispatchEvent(new CustomEvent('nc:created', { detail: { requisito_base_id: ncModalData.requisito_base_id, nc_id: json.id } }))
      // also emit a notifications:new event so navbars can update badge counts immediately for assigned responsables
      try{ window.dispatchEvent(new CustomEvent('notifications:new', { detail: { nc_id: json.id, requisito_base_id: ncModalData.requisito_base_id, responsables: payload.responsables || [] } })) }catch(_){ }
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'NC creada', message: `NC #${json.id} creada y asignada.`, type: 'info', ttl: 6000 } }))
      setNcModalOpen(false)
    }catch(e){ console.error('submitNC error', e); alert('Error interno') }
  }

  if(loading) return <div className="p-4">Cargando...</div>

  return (
    <Layout title={titleText} sidebar={<NavBarISO/>}>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <RequirementContent node={requisito} />
        </div>
      </div>
      {ncModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-[9999] pt-16">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[calc(100vh-4rem)] overflow-auto">
            <h3 className="text-lg font-semibold mb-2">Crear No Conformidad</h3>
            <div className="mb-2">
              <label className="text-sm">Título</label>
              <input className="w-full border px-2 py-1" value={ncModalData.titulo} onChange={e=>setNcModalData(d=>({ ...d, titulo: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="text-sm">Descripción</label>
              <textarea className="w-full border px-2 py-1" value={ncModalData.descripcion} onChange={e=>setNcModalData(d=>({ ...d, descripcion: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="text-sm">Asignar a responsables</label>
              <div className="max-h-40 overflow-auto border p-2">
                {(ncModalData.responsables || []).map(r => (
                  <label key={r.id} className="flex items-center gap-2 mb-1"><input type="checkbox" checked={!!r.selected} onChange={e=>{
                    setNcModalData(d=>({ ...d, responsables: d.responsables.map(rr=> rr.id===r.id ? { ...rr, selected: e.target.checked } : rr) }))
                  }} /> {r.nombre} ({r.email})</label>
                ))}
                {(ncModalData.responsables||[]).length===0 && <div className="text-sm text-slate-500">No hay responsables disponibles.</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={()=>setNcModalOpen(false)} className="px-3 py-1 border rounded">Cancelar</button>
              <button onClick={submitNC} className="px-3 py-1 bg-[#00236f] text-white rounded">Crear NC</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
