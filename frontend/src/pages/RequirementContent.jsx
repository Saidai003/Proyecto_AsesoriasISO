import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import fetchWithAuth from '../lib/api'
import Chat from '../components/Chat'
import ConfirmDialog from '../components/ConfirmDialog'
import EvidenceHistoryModal from '../components/EvidenceHistoryModal'
import { hasRole } from '../lib/userUtils'
import UploadArea from '../components/UploadArea'
import { showToast, notifyResponsable } from '../lib/ui'
import { placeholderThumbnail } from '../lib/utils'

const ACTION_LABELS = {
  UPLOAD: 'Subida',
  DELETE: 'Eliminacion',
  UPDATE: 'Actualizacion',
  REPLACE: 'Reemplazo',
  APPROVAL: 'Aprobacion',
  BULK_DELETE: 'Eliminacion masiva'
}

export default function RequirementContent({ node, onRequestCreateNc, onStatusChange }){
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
  const [deletingEvidenceIds, setDeletingEvidenceIds] = useState({})
  const [ncGlobalHistoryOpen, setNcGlobalHistoryOpen] = useState(false)
  const [ncGlobalHistoryLogs, setNcGlobalHistoryLogs] = useState([])
  const [ncGlobalHistoryLoading, setNcGlobalHistoryLoading] = useState(false)
  const [ncGlobalHistoryPage, setNcGlobalHistoryPage] = useState(1)
  const [ncGlobalHistoryPageSize] = useState(10)
  const [ncGlobalHistorySearch, setNcGlobalHistorySearch] = useState('')
  const [ncGlobalHistoryFilterFlowState, setNcGlobalHistoryFilterFlowState] = useState('')
  const [ncGlobalHistoryFilterValidationState, setNcGlobalHistoryFilterValidationState] = useState('')
  const [ncGlobalHistoryFilterFrom, setNcGlobalHistoryFilterFrom] = useState('')
  const [ncGlobalHistoryFilterTo, setNcGlobalHistoryFilterTo] = useState('')
  
  // --- ESTADOS PARA FILTROS AVANZADOS DE BRECHAS ---
  const [ncFilterText, setNcFilterText] = useState('')
  const [ncFilterFlujo, setNcFilterFlujo] = useState('')
  const [ncFilterValidacion, setNcFilterValidacion] = useState('')
  const [ncFilterStartDate, setNcFilterStartDate] = useState('')
  const [ncFilterEndDate, setNcFilterEndDate] = useState('')

  // Extracción dinámica de estados únicos
  const uniqueFlujos = React.useMemo(() => {
    return [...new Set(ncList.map(nc => nc.estado_flujo).filter(Boolean))]
  }, [ncList])

  const uniqueValidaciones = React.useMemo(() => {
    return [...new Set(ncList.map(nc => nc.estado_validacion).filter(Boolean))]
  }, [ncList])

  const syncRequirementStatus = async (evId) => {
    if (!evId) return
    try {
      await fetchWithAuth(`/api/evaluaciones/${evId}/auto-estado`, { method: 'POST' })
    } catch (e) {
      console.error('sync requirement status error', e)
    }
  }

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
      if(!node || !node.id) return null
      try{
        const r = await fetchWithAuth(`/api/evaluaciones/requisito/${node.id}`)
        if(!r.ok) return null
        const json = await r.json()
        const evId = json.id
        if(!mounted) return null
        setEvaluacionId(evId)
        if(json.estado_cumplimiento === 'NA') setManualNA(true)
        const ncr = await fetchWithAuth(`/api/nc/evaluacion/${evId}`)
        if(!ncr.ok) return evId
        const list = await ncr.json()
        if(!mounted) return evId
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
        return evId
      }catch(e){ console.error('load NCs', e); return null }
    }
    loadNCs()
    const handler = async (e) => {
      const detail = e.detail || {}
      if(detail.requisito_base_id == node.id){
        // remember created id to allow scroll+flash after refresh
        if(detail.nc_id) setLastCreatedNcId(detail.nc_id)
        const evId = await loadNCs()
        if (evId) syncRequirementStatus(evId)
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
    setConfirmTitle('Actualizar archivo')
    setConfirmMessage('Se actualizará la referencia a la nueva versión y la versión anterior quedará conservada en Drive. Continuar?')
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
          showToast('Error', 'No se pudo actualizar evidencia: ' + (j.error || res.statusText), 'error', 6000)
          return
        }
        const json = await res.json()
        const updated = json && json.evidence ? json.evidence : json
        const fd = json && json.forceDeleteResult ? json.forceDeleteResult : null
        if(fd){
          if(fd.preserved){
            showToast('Versión conservada', fd.message || 'La versión anterior se mantuvo en Drive.', 'info', 3500)
          } else if(fd.ok){
            showToast('Actualizado', 'Archivo actualizado.', 'success', 2500)
          } else {
            showToast('Advertencia', `No se pudo actualizar el archivo: ${fd.error}`, 'warning', 5000)
          }
        }
        if(updated){
          setEvidences(prev => prev.map(x => x.id===ev.id ? { ...x, ...updated } : x))
          syncRequirementStatus(evaluacionId)
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
          showToast('Evidencia actualizada', updated.nombre_archivo || fileLocal.name, 'success', 3500)
          try{
            if(hasRole(user, 'responsable')){
              notifyResponsable(node && node.id ? Number(node.id) : null, updated.id || ev.id)
            }
          }catch(_){ }
        }else{
          showToast('Error', 'Actualizacion fallida', 'error', 5000)
        }
      }catch(err){
        console.error('update evidence', err)
          showToast('Error', 'Error actualizando evidencia', 'error', 5000)
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
        if(!res.ok){ const j = await res.json().catch(()=>({})); showToast('Error', 'No se pudo guardar: ' + (j.error || res.statusText), 'error', 5000); return }
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

  // Memoized filtered NC list (apply same filters pattern as inline filter)
  const filteredNcList = useMemo(() => {
    return (ncList || []).filter(nc => {
      const matchesText = !ncFilterText || 
        (nc.titulo || '').toLowerCase().includes(ncFilterText.toLowerCase()) || 
        (nc.descripcion || '').toLowerCase().includes(ncFilterText.toLowerCase());
      const matchesFlujo = !ncFilterFlujo || nc.estado_flujo === ncFilterFlujo;
      const matchesValidacion = !ncFilterValidacion || nc.estado_validacion === ncFilterValidacion;

      let matchesDate = true;
      if (ncFilterStartDate || ncFilterEndDate) {
        const dStr = nc.fecha_verificacion_eficacia;
        if (dStr) {
          const ncTime = new Date(dStr).getTime();
          if (ncFilterStartDate) {
            const startTime = new Date(ncFilterStartDate + 'T00:00:00').getTime();
            if (ncTime < startTime) matchesDate = false;
          }
          if (ncFilterEndDate) {
            const endTime = new Date(ncFilterEndDate + 'T23:59:59').getTime();
            if (ncTime > endTime) matchesDate = false;
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesText && matchesFlujo && matchesValidacion && matchesDate;
    })
  }, [ncList, ncFilterText, ncFilterFlujo, ncFilterValidacion, ncFilterStartDate, ncFilterEndDate])

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

  const filteredNcGlobalHistory = useMemo(() => {
    const query = (ncGlobalHistorySearch || '').toLowerCase().trim()
    return (ncGlobalHistoryLogs || []).filter(log => {
      let ok = true
      if(ncGlobalHistoryFilterFlowState) ok = ok && (log.estado_flujo || '') === ncGlobalHistoryFilterFlowState
      if(ncGlobalHistoryFilterValidationState) ok = ok && (log.estado_validacion || '') === ncGlobalHistoryFilterValidationState
      if(ncGlobalHistoryFilterFrom){ const d = new Date(log.fecha_snapshot).toISOString().slice(0,10); ok = ok && d >= ncGlobalHistoryFilterFrom }
      if(ncGlobalHistoryFilterTo){ const d = new Date(log.fecha_snapshot).toISOString().slice(0,10); ok = ok && d <= ncGlobalHistoryFilterTo }
      if(query){
        const haystack = [log.nc_titulo, log.estado_flujo, log.estado_validacion, log.usuario_nombre].filter(Boolean).join(' ').toLowerCase()
        ok = ok && haystack.includes(query)
      }
      return ok
    })
  },[ncGlobalHistoryLogs, ncGlobalHistoryFilterFlowState, ncGlobalHistoryFilterValidationState, ncGlobalHistoryFilterFrom, ncGlobalHistoryFilterTo, ncGlobalHistorySearch])

  useEffect(()=>{
    setNcGlobalHistoryPage(1)
  },[ncGlobalHistoryFilterFlowState, ncGlobalHistoryFilterValidationState, ncGlobalHistoryFilterFrom, ncGlobalHistoryFilterTo, ncGlobalHistorySearch, ncGlobalHistoryLogs])

  const ncGlobalHistoryTotal = filteredNcGlobalHistory.length
  const ncGlobalHistoryTotalPages = Math.max(1, Math.ceil(ncGlobalHistoryTotal / ncGlobalHistoryPageSize))
  const ncGlobalHistoryPageItems = filteredNcGlobalHistory.slice((ncGlobalHistoryPage-1)*ncGlobalHistoryPageSize, ncGlobalHistoryPage*ncGlobalHistoryPageSize)

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

  const [manualNA, setManualNA] = useState(false)

  // Reset manualNA when navigating to a different requisito
  React.useEffect(() => {
    setManualNA(false)
  }, [node?.id])

  const requirementStatus = React.useMemo(() => {
    // If evaluator manually marked as NA (No Aplica / excluded from scope)
    if (manualNA) {
      return { label: 'No Aplica', className: 'bg-slate-400 text-white' }
    }

    // --- Variables base ---
    const totalEvidencias = (evidences || []).length
    const evidenciasAceptadas = (evidences || []).filter(ev => ev.estado_validacion_archivo === 'Aceptado').length
    const evidenciasRechazadas = (evidences || []).filter(ev => ev.estado_validacion_archivo === 'Rechazado').length

    const totalBrechas = (ncList || []).length
    const brechasCerradas = (ncList || []).filter(nc => nc.estado_flujo === 'Cerrada').length
    const brechasAbiertas = totalBrechas - brechasCerradas

    // --- Lógica de estados (orden de prioridad) ---

    // 1. No Evaluado: sin evidencias y sin brechas
    if (totalEvidencias === 0 && totalBrechas === 0) {
      return { label: 'No Evaluado', className: 'bg-slate-100 text-slate-700' }
    }

    // 2. Cumple: al menos 1 evidencia, TODAS aceptadas, 0 brechas abiertas
    if (totalEvidencias > 0 && evidenciasAceptadas === totalEvidencias && brechasAbiertas === 0) {
      return { label: 'Cumple', className: 'bg-green-600 text-white' }
    }

    // 3. No Cumple: al menos 1 brecha abierta O al menos 1 evidencia rechazada
    if (brechasAbiertas > 0 || evidenciasRechazadas > 0) {
      return { label: 'No Cumple', className: 'bg-red-600 text-white' }
    }

    // 4. En Revisión: hay evidencias pendientes sin brechas abiertas ni rechazos
    return { label: 'En Revisión', className: 'bg-amber-500 text-white' }
  }, [ncList, evidences, manualNA])

  React.useEffect(() => {
    if(onStatusChange) onStatusChange(requirementStatus)
  }, [onStatusChange, requirementStatus])

  // Toggle NA exclusion (ISO 9001 Req 4.3 - scope exclusion)
  const toggleNA = async () => {
    if (!evaluacionId) return
    const newEstado = manualNA ? 'No cumple' : 'NA'
    try {
      const res = await fetchWithAuth(`/api/evaluaciones/${evaluacionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_cumplimiento: newEstado })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        showToast('Error', j.error || res.statusText || 'No se pudo actualizar estado', 'error', 5000)
        return
      }
      setManualNA(!manualNA)
      if (newEstado !== 'NA') {
        syncRequirementStatus(evaluacionId)
      }
    } catch (e) {
      console.error('toggleNA error', e)
      showToast('Error', 'No se pudo cambiar el estado NA', 'error', 5000)
    }
  }

  const canModifyEvidence = (ev) => {
    if(!user) return false
    if(hasRole(user, 'admin')) return true
    return user.id === ev.usuario_carga_id
  }

  const canReviewEvidence = () => {
    if(!user) return false
    return hasRole(user, 'evaluador')
  }

  const canEditComment = (ev) => canModifyEvidence(ev)

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
        showToast('Error', j.error || res.statusText || 'No se pudo actualizar estado', 'error', 5000)
        return
      }
      const json = await res.json()
      const updated = json && json.evidence ? json.evidence : json
      setEvidences(prev => prev.map(e => e.id === ev.id ? { ...e, ...(updated || {}) } : e))
      showToast('Estado actualizado', status, 'success', 2500)
      syncRequirementStatus(evaluacionId)
    }catch(e){
      console.error('update evidence status', e)
      showToast('Error', 'Error actualizando estado', 'error', 5000)
    }
  }

  const downloadEvidence = async (ev) => {
    try{
      const res = await fetchWithAuth(`/api/evidencias/${ev.id}/download`)
      if(!res.ok){
        const j = await res.json().catch(()=>({}))
        const msg = j.error || res.statusText || 'No se pudo descargar'
        showToast('Error', msg, 'error', 5000)
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
      showToast('Error', 'Error descargando evidencia', 'error', 5000)
    }
  }

  return (
    <div className="p-4">
      {/* NA exclusion toggle (ISO 9001 Req 4.3) - Only Evaluador can toggle */}
      {hasRole(user, 'evaluador') && evaluacionId && (
        <div className="mb-4">
          <button
            onClick={toggleNA}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${manualNA ? 'bg-slate-400 text-white border-slate-400' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
          >
            {manualNA ? '✓ Marcado como No Aplica (excluido del alcance)' : 'Marcar como No Aplica'}
          </button>
        </div>
      )}
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

          {isEvaluador && filteredEvidences.length === 0 ? (
            <div className="border rounded p-3 mb-3 bg-slate-50">
              <p className="text-sm text-slate-500 text-center">No hay evidencias cargadas para este requisito.</p>
            </div>
          ) : !isEvaluador ? (
            <UploadArea evaluacionId={evaluacionId} onUploaded={(newEv)=>{
              setEvidences(prev => [newEv, ...prev])
              syncRequirementStatus(evaluacionId)
              try{ if(hasRole(user, 'responsable')) notifyResponsable(node && node.id ? Number(node.id) : null, newEv.id) }catch(_){ }
            }} />
          ) : null}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {filteredEvidences && filteredEvidences.length>0 ? filteredEvidences.map(ev => {
              const isImage = /\.(jpe?g|png|gif|webp)$/i.test(ev.nombre_archivo || '')
              const dataUrl = placeholderThumbnail(ev.nombre_archivo)
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
                    {ev.deleted ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-400 text-white text-[10px]">Eliminada</span>
                    ) : (
                      <>
                        {canDownloadEvidence(ev) && (
                          <button
                            onClick={(e)=>{ e.stopPropagation(); downloadEvidence(ev) }}
                            className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px]"
                          >
                            Descargar
                          </button>
                        )}
                        {canModifyEvidence(ev) && (
                          <button
                            onClick={(e)=>{ e.stopPropagation(); requestUpdateEvidence(ev) }}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px]"
                          >
                            Cambiar
                          </button>
                        )}
                        {canModifyEvidence(ev) && (
                          <button
                            onClick={(e)=>{
                              e.stopPropagation()
                              if(deletingEvidenceIds[ev.id]) return
                              setConfirmTitle('Eliminar evidencia')
                              setConfirmMessage('Confirmar eliminacion de la evidencia? Esta accion no se puede deshacer.')
                              setConfirmCallback(()=>async ()=>{
                                setDeletingEvidenceIds(prev => ({ ...prev, [ev.id]: true }))
                                try{
                                  const res = await fetchWithAuth(`/api/evidencias/${ev.id}`, { method: 'DELETE' })
                                  if(!res.ok){ const j = await res.json().catch(()=>({})); alert('No se pudo eliminar: ' + (j.error || res.statusText)); return }
                                  try{
                                    if(blobUrls && blobUrls[ev.id]){ try{ URL.revokeObjectURL(blobUrls[ev.id]) }catch(_){ } setBlobUrls(prev => { const next = { ...prev }; delete next[ev.id]; return next }) }
                                  }catch(_){ }
                                  setEvidences(prev => prev.map(x => x.id === ev.id ? { ...x, deleted: true, deletedAt: new Date().toISOString() } : x))
                                  syncRequirementStatus(evaluacionId)
                                  setEvidenceHistoryTarget(null)
                                  setEvidenceHistoryLogs([])
                                  setEvidenceHistoryOpen(false)
                                  showToast('Evidencia eliminada', 'El historial de cambios se conserva.', 'success', 4000)
                                  try{ if(hasRole(user, 'responsable')) notifyResponsable(node && node.id ? Number(node.id) : null, ev.id) }catch(_){ }
                                }catch(e){ console.error('delete evidence', e); alert('Error eliminando evidencia') }
                                finally{ setDeletingEvidenceIds(prev => { const next = { ...prev }; delete next[ev.id]; return next }) }
                              })
                              setConfirmOpen(true)
                            }}
                            className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] disabled:opacity-60"
                            aria-label="Eliminar evidencia"
                            disabled={!!deletingEvidenceIds[ev.id]}
                          >
                            {deletingEvidenceIds[ev.id] ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            }) : (
              <div className="col-span-full text-sm text-slate-500">No hay evidencias cargadas.</div>
            )}
          </div>
        </div>

        {/* --- INICIO DEL CONTENEDOR DE BRECHAS CON FILTROS AVANZADOS --- */}
        <div className="mt-4 p-4 border rounded-xl bg-white shadow-sm border-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="text-sm font-semibold text-slate-800">Brechas Detectadas en el GAP Analysis</h5>
              <button onClick={openNcGlobalHistoryModal} className="px-2.5 py-1 border rounded-md text-xs hover:bg-slate-50 transition-colors text-slate-600">Historial global de brechas</button>
            </div>
            {onRequestCreateNc && (
              <button onClick={onRequestCreateNc} className="px-3 py-1.5 border border-transparent rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm self-start md:self-auto">
                + Registrar Brecha de Cumplimiento
              </button>
            )}
          </div>
          
          {/* BARRA DE FILTROS AVANZADOS */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg flex flex-wrap items-end gap-3 text-xs">
            
            {/* Búsqueda por texto */}
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Buscar por Texto</label>
              <input 
                type="text" 
                placeholder="🔍 Título o descripción..." 
                value={ncFilterText} 
                onChange={(e) => setNcFilterText(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
              />
            </div>

            {/* Filtro Estado Flujo */}
            <div className="flex flex-col gap-1 w-36">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado Flujo</label>
              <select 
                value={ncFilterFlujo} 
                onChange={(e) => setNcFilterFlujo(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {uniqueFlujos.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Filtro Estado Validación */}
            <div className="flex flex-col gap-1 w-36">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Validación</label>
              <select 
                value={ncFilterValidacion} 
                onChange={(e) => setNcFilterValidacion(e.target.value)}
                className="px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                {uniqueValidaciones.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            {/* Rango de Fechas: Desde */}
            <div className="flex flex-col gap-1 w-36">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Desde (Veredicto)</label>
              <input 
                type="date" 
                value={ncFilterStartDate} 
                onChange={(e) => setNcFilterStartDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Rango de Fechas: Hasta */}
            <div className="flex flex-col gap-1 w-36">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Hasta (Veredicto)</label>
              <input 
                type="date" 
                value={ncFilterEndDate} 
                onChange={(e) => setNcFilterEndDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Botón para resetear filtros */}
            {(ncFilterText || ncFilterFlujo || ncFilterValidacion || ncFilterStartDate || ncFilterEndDate) && (
              <button 
                onClick={() => {
                  setNcFilterText('');
                  setNcFilterFlujo('');
                  setNcFilterValidacion('');
                  setNcFilterStartDate('');
                  setNcFilterEndDate('');
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-md bg-white hover:bg-slate-100 font-medium transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* TABLA DE BRECHAS FILTRADA */}
          <div className="mt-4">
            {ncList && ncList.length > 0 ? (
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-sm table-fixed min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-xs text-slate-500 text-left">
                      <th className="p-2.5 w-12 font-medium">ID</th>
                      <th className="p-2.5 w-48 font-medium">Título</th>
                      <th className="p-2.5 w-28 font-medium">Estado flujo</th>
                      <th className="p-2.5 w-28 font-medium">Estado validación</th>
                      <th className="p-2.5 w-32 font-medium">Fecha veredicto</th>
                      <th className="p-2.5 w-32 font-medium">Fecha última edición</th>
                      <th className="p-2.5 w-40 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNcList
                      /* SÚPER FILTRO COMBINADO EN TIEMPO REAL */
                      
                      .map(nc => (
                      <tr id={`nc-${nc.id}`} ref={el => { try{ ncRowRefs.current[nc.id] = el }catch(_){} }} key={nc.id} className="border-b border-slate-100 bg-white text-left hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 text-slate-500">#{nc.id}</td>
                        <td className="p-2.5 font-medium text-slate-700 truncate" title={nc.titulo}>{nc.titulo || '-'}</td>
                        <td className="p-2.5">
                          {nc.estado_flujo ? (
                            <span className={`${renderNcBadge(nc.estado_flujo)} px-2 py-0.5 rounded text-[11px] font-medium`}>{nc.estado_flujo}</span>
                          ) : '-'}
                        </td>
                        <td className="p-2.5">
                          {nc.estado_validacion ? (
                            <span className={`${renderNcBadge(nc.estado_validacion)} px-2 py-0.5 rounded text-[11px] font-medium`}>{nc.estado_validacion}</span>
                          ) : '-'}
                        </td>
                        <td className="p-2.5 text-xs text-slate-600">
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
                        <td className="p-2.5 text-xs text-slate-500">{formatDate(nc.fecha_ultima_edicion)}</td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5 justify-start flex-wrap">
                            <button onClick={()=>{ navigate(`/nc/${nc.id}`) }} className="px-2 py-1 border border-slate-200 rounded text-xs bg-white hover:bg-slate-50 text-slate-600 transition-colors">Ver</button>
                            <button onClick={()=>{ setRespModalList(nc.responsables || []); setRespModalOpen(true) }} className="px-2 py-1 border border-slate-200 rounded text-xs bg-white hover:bg-slate-50 text-slate-600 transition-colors">Responsables</button>
                            
                            {hasRole(user, 'evaluador') && (
                              <button 
                                onClick={async () => {
                                  if (!window.confirm('¿Está seguro de que desea eliminar esta brecha? Esta acción no se puede deshacer.')) return;
                                  try {
                                    const res = await fetchWithAuth(`/api/nc/${nc.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      setNcList(prev => prev.filter(item => item.id !== nc.id));
                                      showToast('Eliminada', 'Brecha eliminada correctamente.', 'success', 3000);
                                      syncRequirementStatus(evaluacionId)
                                    } else {
                                      const err = await res.json().catch(()=>({}));
                                      showToast('Error', err.error || 'No se pudo eliminar.', 'error', 5000);
                                    }
                                  } catch (e) {
                                    console.error('Error al eliminar brecha:', e);
                                  }
                                }}
                                className="px-2 py-1 border border-red-200 text-red-600 rounded text-xs bg-white hover:bg-red-50 hover:border-red-300 transition-colors"
                                title="Eliminar brecha"
                              >
                                Borrar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-6 text-center border border-dashed rounded-lg bg-slate-50">No hay brechas registradas en este requisito.</div>
            )}
          </div>
        </div>
        {/* --- FIN DEL CONTENEDOR DE BRECHAS --- */}

        <Chat evaluacionId={evaluacionId} requisitoBaseId={node && node.id} evidences={evidences} ncList={ncList} />
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

      {ncGlobalHistoryOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-6xl p-4 h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Historial global de brechas</h4>
              <button onClick={()=>setNcGlobalHistoryOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
              <input value={ncGlobalHistorySearch} onChange={(e)=>setNcGlobalHistorySearch(e.target.value)} placeholder="Buscar (título, estado, usuario)" className="px-3 py-2 border rounded text-sm md:col-span-2" />
              <select value={ncGlobalHistoryFilterFlowState} onChange={(e)=>setNcGlobalHistoryFilterFlowState(e.target.value)} className="px-3 py-2 border rounded text-sm">
                <option value="">Estado flujo: todos</option>
                <option value="Abierta">Abierta</option>
                <option value="Verificación">Verificación</option>
                <option value="Cerrada">Cerrada</option>
              </select>
              <select value={ncGlobalHistoryFilterValidationState} onChange={(e)=>setNcGlobalHistoryFilterValidationState(e.target.value)} className="px-3 py-2 border rounded text-sm">
                <option value="">Validación: todos</option>
                <option value="Acepto">Acepto</option>
                <option value="Parcial">Parcial</option>
                <option value="No Acepto">No Acepto</option>
              </select>
              <div className="flex gap-1">
                <input type="date" value={ncGlobalHistoryFilterFrom} onChange={(e)=>setNcGlobalHistoryFilterFrom(e.target.value)} className="px-2 py-1 border rounded text-xs flex-1" placeholder="Desde" title="Desde" />
                <input type="date" value={ncGlobalHistoryFilterTo} onChange={(e)=>setNcGlobalHistoryFilterTo(e.target.value)} className="px-2 py-1 border rounded text-xs flex-1" placeholder="Hasta" title="Hasta" />
              </div>
            </div>
            <div className="flex-1 overflow-auto border rounded p-2 bg-slate-50">
              {ncGlobalHistoryLoading ? (
                <div>Cargando historial...</div>
              ) : ncGlobalHistoryPageItems.length === 0 && ncGlobalHistoryLogs.length === 0 ? (
                <div className="text-sm text-slate-500">No hay historial de brechas.</div>
              ) : ncGlobalHistoryPageItems.length === 0 ? (
                <div className="text-sm text-slate-500">No hay resultados que coincidan con los filtros.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-600 bg-slate-100 sticky top-0">
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">Título</th>
                      <th className="p-2 text-left">Estado flujo</th>
                      <th className="p-2 text-left">Validación</th>
                      <th className="p-2 text-left">Fecha veredicto</th>
                      <th className="p-2 text-left">Fecha snapshot</th>
                      <th className="p-2 text-left">Editado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ncGlobalHistoryPageItems.map(log => (
                      <tr key={`${log.id}-${log.fecha_snapshot}`} className="border-b text-xs hover:bg-slate-100">
                        <td className="p-2">#{log.nc_id}</td>
                        <td className="p-2 truncate" title={log.nc_titulo}>{log.nc_titulo || '-'}</td>
                        <td className="p-2">{log.estado_flujo || '-'}</td>
                        <td className="p-2">{log.estado_validacion || '-'}</td>
                        <td className="p-2 text-xs">{log.fecha_verificacion_eficacia ? new Date(log.fecha_verificacion_eficacia).toLocaleDateString() : '-'}</td>
                        <td className="p-2 text-xs">{log.fecha_snapshot ? new Date(log.fecha_snapshot).toLocaleString() : '-'}</td>
                        <td className="p-2">{log.usuario_nombre || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">{ncGlobalHistoryTotal} registros</div>
              <div className="flex items-center gap-2">
                <button disabled={ncGlobalHistoryPage <= 1} onClick={()=>setNcGlobalHistoryPage(p => Math.max(1, p-1))} className="px-2 py-1 border rounded text-xs disabled:opacity-50">Anterior</button>
                <div className="text-xs">{ncGlobalHistoryPage} / {ncGlobalHistoryTotalPages}</div>
                <button disabled={ncGlobalHistoryPage >= ncGlobalHistoryTotalPages} onClick={()=>setNcGlobalHistoryPage(p => Math.min(ncGlobalHistoryTotalPages, p+1))} className="px-2 py-1 border rounded text-xs disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      )}

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