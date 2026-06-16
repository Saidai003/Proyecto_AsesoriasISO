import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import fetchWithAuth from '../lib/api'
import Chat from '../components/Chat'
import ConfirmDialog from '../components/ConfirmDialog'
import EvidenceHistoryModal from '../components/EvidenceHistoryModal'
import { hasRole } from '../lib/userUtils'
import UploadArea from '../components/UploadArea'

export default function RequirementContent({ node, onRequestCreateNc }){
  const navigate = useNavigate()
  const { user } = useAuth()
  const [evidences, setEvidences] = useState([])
  const [selectedEvidence, setSelectedEvidence] = useState(null)
  const [blobUrls, setBlobUrls] = useState({})
  const blobUrlsRef = useRef({})
  const [modalComment, setModalComment] = useState('')
  const [ncList, setNcList] = useState([])
  const [lastCreatedNcId, setLastCreatedNcId] = useState(null)
  const ncRowRefs = useRef({})
  const [respModalOpen, setRespModalOpen] = useState(false)
  const [respModalList, setRespModalList] = useState([])
  const [evaluacionId, setEvaluacionId] = useState(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyLogs, setHistoryLogs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize] = useState(8)
  const [historyFilterStatus, setHistoryFilterStatus] = useState('')
  const [historyFilterEstado, setHistoryFilterEstado] = useState('')
  const [historyFilterFrom, setHistoryFilterFrom] = useState('')
  const [historyFilterTo, setHistoryFilterTo] = useState('')
  const [historyFilterType, setHistoryFilterType] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [evidenceSearch, setEvidenceSearch] = useState('')
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState('')
  const [evidenceTypeFilter, setEvidenceTypeFilter] = useState('')
  const [evidenceHistoryOpen, setEvidenceHistoryOpen] = useState(false)
  const [evidenceHistoryLoading, setEvidenceHistoryLoading] = useState(false)
  const [evidenceHistoryLogs, setEvidenceHistoryLogs] = useState([])
  const [evidenceHistoryTarget, setEvidenceHistoryTarget] = useState(null)
  const [evidenceNotifs, setEvidenceNotifs] = useState({})
  const [ncGlobalHistoryOpen, setNcGlobalHistoryOpen] = useState(false)
  const [ncGlobalHistoryLogs, setNcGlobalHistoryLogs] = useState([])
  const [ncGlobalHistoryLoading, setNcGlobalHistoryLoading] = useState(false)

  // keep ref in sync for cleanup on unmount
  useEffect(()=>{ blobUrlsRef.current = blobUrls },[blobUrls])

  // revoke any created object URLs on unmount
  useEffect(()=>{
    return ()=>{
      try{ Object.values(blobUrlsRef.current || {}).forEach(u=>{ try{ URL.revokeObjectURL(u) }catch(_){} }) }catch(_){ }
    }
  },[])

  useEffect(()=>{
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
    return ()=>{ mounted = false }
  },[node])

  // Fetch protected image previews for evidences that reference Drive
  useEffect(()=>{
    let mounted = true
    const toFetch = (evidences || []).filter(ev => ev && ev.url_archivo && ev.url_archivo.startsWith('drive://') && (/\.(jpe?g|png|gif|webp)$/i).test(ev.nombre_archivo))
    toFetch.forEach(ev => {
      if(blobUrls[ev.id]) return
      ;(async ()=>{
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
  },[evidences, blobUrls])

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
        setNcList(list || [])
        // clear unread notifications related to this requisito (delete in DB)
        ;(async ()=>{
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
    const handler = (e) => {
      const detail = e.detail || {}
      if(detail.requisito_base_id == node.id){
        // remember created id to allow scroll+flash after refresh
        if(detail.nc_id) setLastCreatedNcId(detail.nc_id)
        loadNCs()
      }
    }
    window.addEventListener('nc:created', handler)
    return ()=>{ mounted = false; window.removeEventListener('nc:created', handler) }
  },[node])

  const isEvaluador = hasRole(user, 'evaluador')

  // after ncList updates, if there is a lastCreatedNcId and user is evaluador, scroll to it and flash
  useEffect(()=>{
    if(!lastCreatedNcId) return
    if(!isEvaluador) return
    const el = ncRowRefs.current && ncRowRefs.current[lastCreatedNcId]
    if(el && el.scrollIntoView){
      try{ el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }catch(_){ try{ el.scrollIntoView() }catch(_){} }
      // add highlight
      el.classList.add('ring-4','ring-yellow-300')
      setTimeout(()=>{ try{ el.classList.remove('ring-4','ring-yellow-300') }catch(_){}; setLastCreatedNcId(null) }, 2000)
    }else{
      // nothing found, clear after short timeout
      setTimeout(()=>setLastCreatedNcId(null), 2000)
    }
  },[ncList, lastCreatedNcId, isEvaluador])

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
  const updateFileRef = useRef(null)
  const [pendingUpdateEv, setPendingUpdateEv] = useState(null)

  const onUpdateFileChosen = async (e)=>{
    const file = e.target.files && e.target.files[0]
    if(!file) return
    setConfirmTitle('Reemplazar archivo')
    setConfirmMessage('Se eliminara el archivo actual en Drive y se subira el nuevo. Continuar?')
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
        if(!res.ok){
          const j = await res.json().catch(()=>({}))
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'No se pudo actualizar evidencia: ' + (j.error || res.statusText), type: 'error', ttl: 6000 } }))
          return
        }
        const json = await res.json()
        const updated = json && json.evidence ? json.evidence : json
        const fd = json && json.forceDeleteResult ? json.forceDeleteResult : null
        if(fd){
          if(fd.ok) window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Eliminado', message: 'Archivo anterior eliminado.', type: 'info', ttl: 2500 } }))
          else window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Advertencia', message: `No se pudo eliminar archivo anterior: ${fd.error}`, type: 'warning', ttl: 5000 } }))
        }
        if(updated){
          setEvidences(prev => prev.map(x => x.id===ev.id ? { ...x, ...updated } : x))
          try{
            const isImage = (/\.(jpe?g|png|gif|webp)$/i).test(updated.nombre_archivo || fileLocal.name)
            if(blobUrls && blobUrls[ev.id]){
              try{ URL.revokeObjectURL(blobUrls[ev.id]) }catch(_){ }
              setBlobUrls(prev => { const next = { ...prev }; delete next[ev.id]; return next })
            }
            if(isImage && updated.url_archivo && String(updated.url_archivo).startsWith('drive://')){
              ;(async ()=>{
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
          try{
            if(hasRole(user, 'responsable')){
              window.dispatchEvent(new CustomEvent('notifications:new', { detail: { requisito_base_id: node && node.id ? Number(node.id) : null, evidencia_id: updated.id || ev.id } }))
            }
          }catch(_){ }
        }else{
          window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Actualizacion fallida', type: 'error', ttl: 5000 } }))
        }
      }catch(err){
        console.error('update evidence', err)
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error actualizando evidencia', type: 'error', ttl: 5000 } }))
      }
    })
    setConfirmOpen(true)
  }

  const requestUpdateEvidence = (ev) => {
    setPendingUpdateEv(ev)
    if(!updateFileRef.current){
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
    ;(async ()=>{
      try{
        const res = await fetchWithAuth(`/api/evidencias/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comentario_evidencia: comment }) })
        if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo guardar: ' + (j.error || res.statusText)); return }
        const json = await res.json()
        const updated = json && json.evidence ? json.evidence : json
        setEvidences(prev => prev.map(e => e.id === id ? { ...e, ...(updated || {}) } : e))
        setSelectedEvidence(prev => prev && prev.id === id ? { ...prev, ...(updated || {}) } : prev)
        closeEvidence()
      }catch(e){ console.error('save comment', e); alert('Error guardando comentario') }
    })()
  }

  if(!node) return <div className="p-4">No encontrado</div>
  const children = node.children || []

  const ACTION_LABELS = {
    UPLOAD: 'Subida',
    DELETE: 'Eliminacion',
    UPDATE: 'Actualizacion',
    REPLACE: 'Reemplazo',
    APPROVAL: 'Aprobacion',
    BULK_DELETE: 'Eliminacion masiva'
  }

  const filteredEvidences = useMemo(() => {
    const query = (evidenceSearch || '').toLowerCase().trim()
    return (evidences || []).filter(ev => {
      const status = ev.estado_validacion_archivo || 'Pendiente'
      if(evidenceStatusFilter && status !== evidenceStatusFilter) return false
      const ext = (ev.nombre_archivo || '').split('.').pop().toLowerCase()
      if(evidenceTypeFilter){
        if(evidenceTypeFilter === 'imagen' && !(/\.(jpe?g|png|gif|webp)$/i).test(ev.nombre_archivo || '')) return false
        if(evidenceTypeFilter === 'pdf' && ext !== 'pdf') return false
        if(evidenceTypeFilter === 'doc' && !['doc','docx','xlsx','ppt','pptx'].includes(ext)) return false
      }
      if(!query) return true
      const haystack = [ev.nombre_archivo, ev.comentario_evidencia, status, ev.usuario_nombre].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  },[evidences, evidenceSearch, evidenceStatusFilter, evidenceTypeFilter])

  const filteredHistory = useMemo(() => {
    const query = (historySearch || '').toLowerCase().trim()
    return (historyLogs || []).filter(l => {
      let ok = true
      if(historyFilterStatus) ok = ok && l.tipo_accion === historyFilterStatus
      if(historyFilterEstado) ok = ok && (l.estado_validacion_archivo || '') === historyFilterEstado
      if(historyFilterType){
        const name = (l.nombre_archivo || l.evidencia_nombre || '').toLowerCase()
        const ext = name.split('.').pop() || ''
        if(historyFilterType === 'excel_csv') ok = ok && ['xls','xlsx','csv'].includes(ext)
      }
      if(historyFilterFrom){ const d = new Date(l.fecha_accion).toISOString().slice(0,10); ok = ok && d >= historyFilterFrom }
      if(historyFilterTo){ const d = new Date(l.fecha_accion).toISOString().slice(0,10); ok = ok && d <= historyFilterTo }
      if(query){
        const haystack = [l.nombre_archivo, l.usuario_nombre, l.detalle, l.evidencia_nombre, l.tipo_accion].filter(Boolean).join(' ').toLowerCase()
        ok = ok && haystack.includes(query)
      }
      return ok
    })
  },[historyLogs, historyFilterStatus, historyFilterEstado, historyFilterType, historyFilterFrom, historyFilterTo, historySearch])

  useEffect(()=>{
    setHistoryPage(1)
  },[historyFilterStatus, historyFilterEstado, historyFilterType, historyFilterFrom, historyFilterTo, historySearch, historyLogs])

  const historyTotal = filteredHistory.length
  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize))
  const historyPageItems = filteredHistory.slice((historyPage-1)*historyPageSize, historyPage*historyPageSize)

  const computeSrc = (url) => {
    if(!url) return null
    if(url.startsWith('http')) return url
    if(url.startsWith('/uploads')) return `${window.location.protocol}//${window.location.hostname}:3000${url}`
    return url
  }

  const formatDate = (d) => {
    if(!d) return '-'
    try{
      const dt = new Date(d)
      const dd = String(dt.getDate()).padStart(2, '0')
      const mm = String(dt.getMonth() + 1).padStart(2, '0')
      const yyyy = dt.getFullYear()
      return `${dd}/${mm}/${yyyy}`
    }catch(_){ return d }
  }

  const openHistoryModal = async ()=>{
    setHistoryModalOpen(true)
    setHistoryLoading(true)
    try{
      if(!evidences || evidences.length === 0){
        setHistoryLogs([])
        return
      }
      const responses = await Promise.all(
        evidences.map(ev => fetchWithAuth(`/api/evidencias/${ev.id}/history`))
      )
      const logs = []
      for(let i = 0; i < responses.length; i++){
        const res = responses[i]
        if(!res.ok) continue
        const json = await res.json()
        const ev = evidences[i]
        const evName = ev && ev.nombre_archivo ? ev.nombre_archivo : `#${ev.id}`
        ;(json.logs || []).forEach(l => {
          logs.push({ ...l, evidencia_nombre: evName })
        })
      }
      logs.sort((a, b) => new Date(b.fecha_accion) - new Date(a.fecha_accion))
      setHistoryLogs(logs)
    }catch(e){
      console.error('load history error', e)
      setHistoryLogs([])
    }finally{
      setHistoryLoading(false)
    }
  }

  const openNcGlobalHistoryModal = async ()=>{
    if(!evaluacionId){
      setNcGlobalHistoryLogs([])
      setNcGlobalHistoryOpen(true)
      return
    }
    setNcGlobalHistoryOpen(true)
    setNcGlobalHistoryLoading(true)
    try{
      const res = await fetchWithAuth(`/api/nc/evaluacion/${evaluacionId}/hist`)
      if(!res.ok){
        setNcGlobalHistoryLogs([])
        return
      }
      const json = await res.json()
      setNcGlobalHistoryLogs(json || [])
    }catch(e){
      console.error('load nc global history error', e)
      setNcGlobalHistoryLogs([])
    }finally{
      setNcGlobalHistoryLoading(false)
    }
  }

  // Listen for external notification events and mark evidence-level badges
  useEffect(()=>{
    const handler = (e) => {
      try{
        const d = e.detail || {}
        const reqId = d.requisito_base_id || d.requisitoId || null
        const evId = d.evidencia_id || d.evidenciaId || null
        if(!reqId) return
        if(node && Number(node.id) !== Number(reqId)) return
        if(evId){
          setEvidenceNotifs(prev => ({ ...(prev||{}), [Number(evId)]: true }))
        }
      }catch(_){ }
    }
    window.addEventListener('notifications:new', handler)
    // Also clear badges when requisito cleared globally
    const clearHandler = (e) => {
      try{
        const rid = e.detail && e.detail.requisitoId
        if(!rid) return
        if(node && Number(node.id) === Number(rid)) setEvidenceNotifs({})
      }catch(_){ }
    }
    window.addEventListener('notifications:cleared', clearHandler)
    return ()=>{ window.removeEventListener('notifications:new', handler); window.removeEventListener('notifications:cleared', clearHandler) }
  },[node])

  const openEvidenceHistory = async (ev) => {
    if(!ev) return
    // clear evidence-level notification visual immediately
    try{ clearNotificationsForEvidence(ev.id) }catch(_){ }
    setEvidenceHistoryTarget(ev)
    setEvidenceHistoryOpen(true)
    setEvidenceHistoryLoading(true)
    try{
      const res = await fetchWithAuth(`/api/evidencias/${ev.id}/history`)
      if(!res.ok){
        setEvidenceHistoryLogs([])
        return
      }
      const json = await res.json()
      setEvidenceHistoryLogs(json.logs || [])
    }catch(e){
      console.error('load evidence history error', e)
      setEvidenceHistoryLogs([])
    }finally{
      setEvidenceHistoryLoading(false)
    }
  }

  const clearNotificationsForEvidence = async (evidenceId) => {
    try{
      setEvidenceNotifs(prev => { const next = { ...(prev||{}) }; delete next[Number(evidenceId)]; return next })
    }catch(_){ }
    try{
      const r = await fetchWithAuth('/api/notifications')
      if(!r.ok) return
      const list = await r.json()
      for(const n of (list||[])){
        try{
          if(n && n.link && String(n.link).includes(String(evidenceId))){
            await fetchWithAuth(`/api/notifications/${n.id}/read`, { method: 'PATCH' })
          }
        }catch(_){ }
      }
    }catch(e){ console.error('clear notif for evidence error', e) }
  }

  const renderStatus = (status) => {
    if(status === 'Aceptado') return 'bg-green-600 text-white'
    if(status === 'Rechazado') return 'bg-red-600 text-white'
    return 'bg-yellow-500 text-white'
  }

  const renderNcBadge = (s) => {
    const st = (s || '').toString().toLowerCase()
    if(!st) return 'bg-slate-100 text-slate-700'
    if(st.includes('acept')) return 'bg-green-600 text-white'
    if(st.includes('no acept') || st.includes('rechaz')) return 'bg-red-600 text-white'
    if(st.includes('parcial')) return 'bg-yellow-500 text-white'
    // fallback
    return 'bg-slate-100 text-slate-700'
  }

  const canDeleteEvidence = (ev) => {
    if(!user) return false
    if(hasRole(user, 'admin')) return true
    return user.id === ev.usuario_carga_id
  }

  const canUpdateEvidence = (ev) => {
    if(!user) return false
    if(hasRole(user, 'admin')) return true
    return user.id === ev.usuario_carga_id
  }

  const canReviewEvidence = () => {
    if(!user) return false
    return hasRole(user, 'evaluador')
  }

  const canEditComment = (ev) => {
    if(!user) return false
    if(hasRole(user, 'admin')) return true
    return user.id === ev.usuario_carga_id
  }

  const canDownloadEvidence = () => {
    if(!user) return false
    return hasRole(user, 'evaluador') || hasRole(user, 'responsable') || hasRole(user, 'admin')
  }

  const updateEvidenceStatus = async (ev, status) => {
    try{
      const res = await fetchWithAuth(`/api/evidencias/${ev.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_validacion_archivo: status })
      })
      if(!res.ok){
        const j = await res.json().catch(()=>({}))
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: j.error || res.statusText || 'No se pudo actualizar estado', type: 'error', ttl: 5000 } }))
        return
      }
      const json = await res.json()
      const updated = json && json.evidence ? json.evidence : json
      setEvidences(prev => prev.map(e => e.id === ev.id ? { ...e, ...(updated || {}) } : e))
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Estado actualizado', message: status, type: 'success', ttl: 2500 } }))
    }catch(e){
      console.error('update evidence status', e)
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error actualizando estado', type: 'error', ttl: 5000 } }))
    }
  }

  const downloadEvidence = async (ev) => {
    try{
      const res = await fetchWithAuth(`/api/evidencias/${ev.id}/download`)
      if(!res.ok){
        const j = await res.json().catch(()=>({}))
        const msg = j.error || res.statusText || 'No se pudo descargar'
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: msg, type: 'error', ttl: 5000 } }))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = ev.nombre_archivo || `evidencia-${ev.id}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }catch(e){
      console.error('download evidence error', e)
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error descargando evidencia', type: 'error', ttl: 5000 } }))
    }
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

        <div className="mt-3 p-3 border rounded bg-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
            <h5 className="text-sm font-medium">Archivos</h5>
            <div className="flex items-center gap-2">
              <button onClick={openHistoryModal} className="px-3 py-1 border rounded text-xs">Historial global</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input value={evidenceSearch} onChange={(e)=>setEvidenceSearch(e.target.value)} placeholder="Buscar evidencia" className="px-3 py-2 border rounded text-sm" />
            <select value={evidenceStatusFilter} onChange={(e)=>setEvidenceStatusFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
              <option value="">Estado: todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Rechazado">Rechazado</option>
            </select>
            <select value={evidenceTypeFilter} onChange={(e)=>setEvidenceTypeFilter(e.target.value)} className="px-3 py-2 border rounded text-sm">
              <option value="">Tipo: todos</option>
              <option value="imagen">Imagen</option>
              <option value="pdf">PDF</option>
              <option value="doc">Office</option>
            </select>
          </div>

          <UploadArea evaluacionId={evaluacionId} onUploaded={(newEv)=>{
            setEvidences(prev => [newEv, ...prev])
            try{ if(hasRole(user, 'responsable')) window.dispatchEvent(new CustomEvent('notifications:new', { detail: { requisito_base_id: node && node.id ? Number(node.id) : null, evidencia_id: newEv.id } })) }catch(_){ }
          }} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredEvidences && filteredEvidences.length>0 ? filteredEvidences.map(ev => {
              const isImage = /\.(jpe?g|png|gif|webp)$/i.test(ev.nombre_archivo || '')
              const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%234a5568'>${ev.nombre_archivo}</text></svg>`
              const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
              const status = ev.estado_validacion_archivo || 'Pendiente'

              return (
                <div id={`evidence-${ev.id}`} key={ev.id} className="relative rounded border bg-white p-1 flex flex-col" >
                  {hasRole(user, 'evaluador') && evidenceNotifs && evidenceNotifs[ev.id] && (
                    <span className="absolute top-2 left-2 w-3 h-3 rounded-full bg-red-600 ring-2 ring-white" aria-hidden="true" />
                  )}
                  <div className="absolute top-1 right-1 flex items-center gap-1" style={{zIndex:20}}>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); openEvidenceHistory(ev) }}
                      className="w-6 h-6 rounded bg-white border flex items-center justify-center"
                      title="Historial"
                      aria-label="Historial"
                    >
                      <svg xmlns="http://w3.org/2000/svg" viewBox="0 0 150 150" width="100%" height="100%" aria-hidden="true">
                        <defs>
                          <linearGradient id={`historyGrad-${ev.id}`} x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#ff512f', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#dd2476', stopOpacity: 1 }} />
                          </linearGradient>
                        </defs>
                        <g transform="translate(15, 15)">
                          <circle cx="60" cy="60" r="54" fill="#f8fafc" />
                          <path d="M 60,12 A 48,48 0 1,1 26,26" fill="none" stroke={`url(#historyGrad-${ev.id})`} strokeWidth="10" strokeLinecap="round"/>
                          <polygon points="26,14 12,32 36,36" fill={`url(#historyGrad-${ev.id})`} />
                          <circle cx="60" cy="60" r="6" fill="#1e293b" />
                          <line x1="60" y1="60" x2="60" y2="36" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                          <line x1="60" y1="60" x2="80" y2="60" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                        </g>
                      </svg>
                    </button>
                    {canReviewEvidence(ev) ? (
                      <select
                        value={status}
                        onChange={(e)=>updateEvidenceStatus(ev, e.target.value)}
                        className={`${renderStatus(status)} px-1.5 py-0.5 rounded text-[10px] border border-transparent`}
                        style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Aceptado">Aceptado</option>
                        <option value="Rechazado">Rechazado</option>
                      </select>
                    ) : (
                      <span className={`${renderStatus(status)} px-1.5 py-0.5 rounded text-[10px]`}>{status}</span>
                    )}
                  </div>
                  <button onClick={()=>{ setSelectedEvidence(ev); try{ clearNotificationsForEvidence(ev.id) }catch(_){ } }} className="flex-1 text-left">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded bg-slate-50 flex items-center justify-center">
                      {isImage ? (
                        <img src={ev.url_archivo && ev.url_archivo.startsWith('drive://') ? (blobUrls[ev.id] || dataUrl) : (computeSrc(ev.url_archivo) || dataUrl)} alt={ev.nombre_archivo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-xs text-slate-600">{(ev.nombre_archivo || '').split('.').pop().toUpperCase()}</div>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-700 truncate" title={ev.nombre_archivo}>{ev.nombre_archivo}</div>
                  </button>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {canDownloadEvidence(ev) && (
                      <button
                        onClick={(e)=>{ e.stopPropagation(); downloadEvidence(ev) }}
                        className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px]"
                      >
                        Descargar
                      </button>
                    )}
                    {canUpdateEvidence(ev) && (
                      <button
                        onClick={(e)=>{ e.stopPropagation(); requestUpdateEvidence(ev) }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px]"
                      >
                        Cambiar
                      </button>
                    )}
                    {canDeleteEvidence(ev) && (
                      <button
                        onClick={(e)=>{
                          e.stopPropagation()
                          setConfirmTitle('Eliminar evidencia')
                          setConfirmMessage('Confirmar eliminacion de la evidencia? Esta accion no se puede deshacer.')
                          setConfirmCallback(()=>async ()=>{
                            try{
                              const res = await fetchWithAuth(`/api/evidencias/${ev.id}`, { method: 'DELETE' })
                              if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo eliminar: ' + (j.error || res.statusText)); return }
                              try{
                                if(blobUrls && blobUrls[ev.id]){ try{ URL.revokeObjectURL(blobUrls[ev.id]) }catch(_){ } setBlobUrls(prev => { const next = { ...prev }; delete next[ev.id]; return next }) }
                              }catch(_){ }
                              setEvidences(prev => prev.filter(x => x.id !== ev.id))
                              try{ if(hasRole(user, 'responsable')) window.dispatchEvent(new CustomEvent('notifications:new', { detail: { requisito_base_id: node && node.id ? Number(node.id) : null, evidencia_id: ev.id } })) }catch(_){ }
                            }catch(e){ console.error('delete evidence', e); alert('Error eliminando evidencia') }
                          })
                          setConfirmOpen(true)
                        }}
                        className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px]"
                        aria-label="Eliminar evidencia"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="col-span-full text-sm text-slate-500">No hay evidencias cargadas.</div>
            )}
          </div>
        </div>

        <div className="mt-4 p-3 border rounded bg-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-medium">Brechas Detectadas en el GAP Analysis</h5>
              <button onClick={openNcGlobalHistoryModal} className="px-3 py-1 border rounded text-xs">Historial global de brechas</button>
            </div>
            {onRequestCreateNc && (
              <button onClick={onRequestCreateNc} className="px-3 py-1 border rounded text-xs">Registrar Brecha de Cumplimiento</button>
            )}
          </div>
          <div className="mt-2">
            {ncList && ncList.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="text-xs text-slate-500 text-left">
                      <th className="p-2 w-10">ID</th>
                      <th className="p-2 w-36">Título</th>
                      <th className="p-2 w-28">Estado flujo</th>
                      <th className="p-2 w-28">Estado validación</th>
                      <th className="p-2 w-36">Fecha veredicto</th>
                      <th className="p-2 w-36">Fecha última edición</th>
                      <th className="p-2 w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncList.map(nc => (
                      <tr id={`nc-${nc.id}`} ref={el => { try{ ncRowRefs.current[nc.id] = el }catch(_){} }} key={nc.id} className="border-b bg-slate-50 text-left">
                        <td className="p-2">{nc.id}</td>
                        <td className="p-2 font-medium">{nc.titulo || '-'}</td>
                        <td className="p-2">
                          {nc.estado_flujo ? (
                            <span className={`${renderNcBadge(nc.estado_flujo)} px-2 py-0.5 rounded text-[12px]`}>{nc.estado_flujo}</span>
                          ) : '-'}
                        </td>
                        <td className="p-2">
                          {nc.estado_validacion ? (
                            <span className={`${renderNcBadge(nc.estado_validacion)} px-2 py-0.5 rounded text-[12px]`}>{nc.estado_validacion}</span>
                          ) : '-'}
                        </td>
                        <td className="p-2">
                          {(() => {
                            const d = nc.fecha_verificacion_eficacia
                            if(!d) return '-' 
                            try{
                              const verdict = new Date(d)
                              const now = new Date()
                              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                              const target = new Date(verdict.getFullYear(), verdict.getMonth(), verdict.getDate())
                              const overdue = today.getTime() >= target.getTime()
                              if(nc.estado_flujo === 'Cerrada'){
                                return (<span className={'text-slate-900 font-medium'}>{formatDate(d)}</span>)
                              }
                              return (<span className={overdue ? 'text-red-600 font-semibold' : ''}>{formatDate(d)}</span>)
                            }catch(_){ return formatDate(d) }
                          })()}
                        </td>
                        <td className="p-2">{formatDate(nc.fecha_ultima_edicion)}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2 justify-start">
                            <button onClick={()=>{ navigate(`/nc/${nc.id}`) }} className="px-2 py-1 border rounded text-xs">Ver</button>
                            <button onClick={()=>{ setRespModalList(nc.responsables || []); setRespModalOpen(true) }} className="px-2 py-1 border rounded text-xs">Responsables</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No hay brechas asociadas.</div>
            )}
          </div>
        </div>

        <Chat requisitoId={node && node.id} evaluacionId={evaluacionId} evidences={evidences} ncList={ncList} />
      </div>

      {selectedEvidence && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Detalle de evidencia</h4>
              <button onClick={closeEvidence} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded bg-slate-50 p-2">
                {(/\.(jpe?g|png|gif|webp)$/i).test(selectedEvidence.nombre_archivo || '') ? (
                  <img
                    src={selectedEvidence.url_archivo && selectedEvidence.url_archivo.startsWith('drive://') ? (blobUrls[selectedEvidence.id] || computeSrc(selectedEvidence.url_archivo)) : (computeSrc(selectedEvidence.url_archivo))}
                    alt={selectedEvidence.nombre_archivo}
                    className="w-full h-56 object-cover rounded"
                  />
                ) : (
                  <div className="h-56 flex items-center justify-center text-slate-500">Vista previa no disponible</div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium">{selectedEvidence.nombre_archivo}</div>
                <div className="text-xs text-slate-500 mt-1">Estado: {selectedEvidence.estado_validacion_archivo || 'Pendiente'}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {canDownloadEvidence(selectedEvidence) && (
                    <button onClick={()=>downloadEvidence(selectedEvidence)} className="px-3 py-1 border rounded text-sm">Descargar</button>
                  )}
                </div>
                <div className="mt-3">
                  <label className="text-xs text-slate-500">Comentario</label>
                  <textarea value={modalComment} onChange={(e)=>setModalComment(e.target.value)} className={`w-full px-3 py-2 border rounded ${canEditComment(selectedEvidence) ? '' : 'bg-slate-100 text-slate-500'}`} rows={4} disabled={!canEditComment(selectedEvidence)} />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={closeEvidence} className="px-3 py-1 border rounded text-sm">Cancelar</button>
                  {canEditComment(selectedEvidence) && (
                    <button onClick={()=>saveEvidenceComment(selectedEvidence.id, modalComment)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Guardar</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {respModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-6 overflow-auto">
          <div className="bg-white rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Responsables asignados</h4>
              <button onClick={()=>setRespModalOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="space-y-2">
              {(!respModalList || respModalList.length===0) ? (
                <div className="text-sm text-slate-500">No hay responsables asignados.</div>
              ) : respModalList.map(r => (
                <div key={r.id} className="p-2 border rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{r.nombre || r.nombre_completo || r.nombre_usuario}</div>
                    <div className="text-xs text-slate-500">{r.email || r.correo || ''}</div>
                  </div>
                  <div className="text-xs text-slate-500">ID {r.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-6xl p-4 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Historial global de evidencias</h4>
              <button onClick={()=>setHistoryModalOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
              <input value={historySearch} onChange={(e)=>setHistorySearch(e.target.value)} placeholder="Buscar" className="px-3 py-2 border rounded text-sm w-full md:col-span-1 md:max-w-sm" />
              <select value={historyFilterStatus} onChange={(e)=>setHistoryFilterStatus(e.target.value)} className="px-3 py-2 border rounded text-sm">
                <option value="">Accion: todas</option>
                {Object.keys(ACTION_LABELS).map(k => (
                  <option key={k} value={k}>{ACTION_LABELS[k]}</option>
                ))}
              </select>
              <select value={historyFilterEstado} onChange={(e)=>setHistoryFilterEstado(e.target.value)} className="px-3 py-2 border rounded text-sm">
                <option value="">Estado: todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aceptado">Aceptado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
              <select value={historyFilterType} onChange={(e)=>setHistoryFilterType(e.target.value)} className="px-3 py-2 border rounded text-sm">
                <option value="">Tipo: todos</option>
                <option value="excel_csv">Excel / CSV</option>
              </select>
              <div className="flex gap-2">
                <input type="date" value={historyFilterFrom} onChange={(e)=>setHistoryFilterFrom(e.target.value)} className="px-2 py-1 border rounded text-xs" />
                <input type="date" value={historyFilterTo} onChange={(e)=>setHistoryFilterTo(e.target.value)} className="px-2 py-1 border rounded text-xs" />
              </div>
            </div>
            <div className="flex-1 overflow-auto border rounded p-2 bg-slate-50">
              {historyLoading ? (
                <div>Cargando...</div>
              ) : historyPageItems.length === 0 ? (
                <div className="text-sm text-slate-500">No hay registros de historial.</div>
              ) : (
                <ul className="space-y-2">
                  {historyPageItems.map(h => (
                    <li key={`${h.id}-${h.fecha_accion}`} className="p-2 border rounded bg-white">
                      <div className="text-sm"><strong>{h.usuario_nombre || 'Sistema'}</strong> — <span className="text-slate-500 text-xs">{new Date(h.fecha_accion).toLocaleString()}</span></div>
                      <div className="text-sm mt-1">{ACTION_LABELS[h.tipo_accion] || h.tipo_accion} — {h.evidencia_nombre || h.nombre_archivo || 'Evidencia'}</div>
                      {h.estado_validacion_archivo && <div className="text-xs text-slate-500 mt-1">Estado: {h.estado_validacion_archivo}</div>}
                      {h.detalle ? <div className="mt-1 text-sm text-slate-700">{h.detalle}</div> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">{historyTotal} registros</div>
              <div className="flex items-center gap-2">
                <button disabled={historyPage <= 1} onClick={()=>setHistoryPage(p => Math.max(1, p-1))} className="px-2 py-1 border rounded text-xs disabled:opacity-50">Anterior</button>
                <div className="text-xs">{historyPage} / {historyTotalPages}</div>
                <button disabled={historyPage >= historyTotalPages} onClick={()=>setHistoryPage(p => Math.min(historyTotalPages, p+1))} className="px-2 py-1 border rounded text-xs disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EvidenceHistoryModal
        open={evidenceHistoryOpen}
        title="Historial de evidencia"
        subtitle={evidenceHistoryTarget ? evidenceHistoryTarget.nombre_archivo : ''}
        logs={evidenceHistoryLogs}
        loading={evidenceHistoryLoading}
        actionLabels={ACTION_LABELS}
        onClose={()=>{ setEvidenceHistoryOpen(false); setEvidenceHistoryLogs([]); setEvidenceHistoryTarget(null) }}
      />

      <input ref={updateFileRef} type="file" onChange={onUpdateFileChosen} className="hidden" />

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={async ()=>{ setConfirmOpen(false); try{ if(confirmCallback) await confirmCallback(); }catch(e){ console.error('confirm callback error', e) } finally{ setConfirmCallback(null) } }}
        onCancel={()=>{ setConfirmOpen(false); setConfirmCallback(null) }}
      />
    </div>
  )
}