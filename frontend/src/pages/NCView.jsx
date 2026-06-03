import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import NavBarISO from '../components/NavBarISO'
import fetchWithAuth from '../lib/api'
import { showToast } from '../lib/toast'
import getErrorText from '../lib/errorMessage'
import { useAuth } from '../AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { getRoleLower, hasRole } from '../lib/userUtils'
import { statusColor, shadeColor, validationColor, flowColor } from '../lib/ncHelpers'
import EditableEstado from '../components/EditableEstado'
import CreateRootAction from '../components/CreateRootAction'

const KANBAN_STATES = ['Pendiente', 'En_Progreso', 'Eficaz', 'No_Eficaz']

const formatKanbanState = (state) => {
  if(state === 'En_Progreso') return 'En progreso'
  if(state === 'No_Eficaz') return 'No eficaz'
  return state || 'Sin estado'
}

const ActionCard = React.memo(({ action, threads, user, createChildAction, savingActionId, draggingActionId, setDraggingActionId, setDropState, setThreads, onRequestDelete }) => {
  const [openForm, setOpenForm] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [showChildren, setShowChildren] = useState(false)
  const [form, setForm] = useState({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '', requiere_nueva_nc: false })
  
  const children = threads.filter(t => Number(t.accion_previa_id) === Number(action.id))
  const isDragging = Number(draggingActionId) === Number(action.id)
  const canDrag = hasRole(user, 'responsable') || hasRole(user, 'admin')
  const isSavingThis = Number(savingActionId) === Number(action.id)

  return (
    <div
      draggable={canDrag}
      onDragStart={(e)=>{
        if(!canDrag) return
        try{ e.dataTransfer.setData('text/plain', String(action.id)); e.dataTransfer.effectAllowed = 'move' }catch(_){ }
        setDraggingActionId(action.id)
      }}
      onDragEnd={(e)=>{ try{ e.dataTransfer.clearData && e.dataTransfer.clearData(); }catch(_){}; setDraggingActionId(null); setDropState('') }}
      className={`group rounded-xl border bg-white shadow-sm transition-all ${isDragging ? 'opacity-90 scale-[0.995]' : 'hover:shadow-md'} ${isSavingThis ? 'ring-2 ring-emerald-300' : ''}`}
    >
      <div className="p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium">{action.nc || `NC-${action.id}`}</span>
              {action.accion_previa_id ? <span className="px-2 py-0.5 rounded-full bg-slate-100">Hija de #{action.accion_previa_id}</span> : <span className="px-2 py-0.5 rounded-full bg-slate-100">Raíz</span>}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 break-words">{action.accion || 'Sin título'}</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{formatKanbanState(action.estado_accion)}</div>
            {canDrag && <div className="text-[11px] text-slate-400">Arrastrar</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Comentario</div>
            <div className="text-slate-700 break-words whitespace-pre-wrap">{action.contenido_comentario || '—'}</div>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Acciones futuras</div>
            <div className="text-slate-700 break-words whitespace-pre-wrap">{action.acciones_futuras_propuestas || '—'}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            {hasRole(user, 'responsable') ? (
              <EditableEstado action={action} onUpdated={(updated)=>{
                setThreads(prev => prev.map(t => t.id === updated.id ? updated : t))
                showToast({ title: 'Acción actualizada', message: 'Estado guardado', type: 'success' })
              }} />
            ) : (
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(action.estado_accion)}`}>{formatKanbanState(action.estado_accion)}</div>
            )}
            <button onClick={()=>setShowChildren(v => !v)} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">
              {showChildren ? 'Ocultar subacciones' : `Ver subacciones (${children.length})`}
            </button>
          </div>
          {hasRole(user, 'responsable') && (
            <div className="flex items-center gap-2">
              <button onClick={()=>setOpenForm(o=>!o)} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">Agregar hija</button>
              <button onClick={()=>{
                setOpenEdit(o=>!o)
                setForm({
                  accion: action.accion || '',
                  contenido_comentario: action.contenido_comentario || '',
                  estado_accion: action.estado_accion || 'Pendiente',
                  acciones_futuras_propuestas: action.acciones_futuras_propuestas || '',
                  requiere_nueva_nc: !!action.requiere_nueva_nc
                })
              }} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">Editar</button>
              <button onClick={()=>{ if(typeof onRequestDelete === 'function'){ onRequestDelete(action.id) } }} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">Eliminar</button>
            </div>
          )}
        </div>

        {showChildren && children.length > 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 space-y-2">
            {children.map(child => (
              <div key={child.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-xs border">
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium">#{child.id}</span> {child.accion || 'Sin título'}
                </div>
                <div className="px-2 py-0.5 rounded-full bg-slate-100 shrink-0">{formatKanbanState(child.estado_accion)}</div>
              </div>
            ))}
          </div>
        )}

        {openForm && (
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="mb-2 text-sm font-medium">Crear acción hija</div>
            <input placeholder="Acción" value={form.accion} onChange={e=>setForm({...form, accion: e.target.value})} className="w-full px-2 py-1 border rounded mb-2 text-sm" />
            <textarea placeholder="Comentario" value={form.contenido_comentario} onChange={e=>setForm({...form, contenido_comentario: e.target.value})} className="w-full px-2 py-1 border rounded mb-2 text-sm" />
            <div className="flex items-center gap-2 mb-2">
              <select value={form.estado_accion} onChange={e=>setForm({...form, estado_accion: e.target.value})} className="px-2 py-1 border rounded text-sm">
                <option value="Pendiente">Pendiente</option>
                <option value="En_Progreso">En_Progreso</option>
                <option value="Eficaz">Eficaz</option>
                <option value="No_Eficaz">No_Eficaz</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>{ createChildAction(action.id, form); setOpenForm(false); setForm({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '', requiere_nueva_nc: false }) }} className="px-3 py-1 bg-[#00236f] text-white text-sm rounded">Crear</button>
              <button onClick={()=>setOpenForm(false)} className="px-3 py-1 border rounded text-sm">Cancelar</button>
            </div>
          </div>
        )}
        {openEdit && (
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="mb-2 text-sm font-medium">Editar acción</div>
            <input placeholder="Acción" value={form.accion} onChange={e=>setForm({...form, accion: e.target.value})} className="w-full px-2 py-1 border rounded mb-2 text-sm" />
            <textarea placeholder="Comentario" value={form.contenido_comentario} onChange={e=>setForm({...form, contenido_comentario: e.target.value})} className="w-full px-2 py-1 border rounded mb-2 text-sm" />
            <div className="flex items-center gap-2 mb-2">
              <select value={form.estado_accion} onChange={e=>setForm({...form, estado_accion: e.target.value})} className="px-2 py-1 border rounded text-sm">
                <option value="Pendiente">Pendiente</option>
                <option value="En_Progreso">En_Progreso</option>
                <option value="Eficaz">Eficaz</option>
                <option value="No_Eficaz">No_Eficaz</option>
              </select>
              <input placeholder="Acciones futuras" value={form.acciones_futuras_propuestas} onChange={e=>setForm({...form, acciones_futuras_propuestas: e.target.value})} className="px-2 py-1 border rounded text-sm flex-1" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-sm inline-flex items-center gap-2"><input type="checkbox" checked={form.requiere_nueva_nc} onChange={e=>setForm({...form, requiere_nueva_nc: e.target.checked})} /> Requiere nueva NC</label>
            </div>
            <div className="flex gap-2">
              <button onClick={async ()=>{
                try{
                  const payload = {
                    accion: form.accion,
                    contenido_comentario: form.contenido_comentario,
                    acciones_futuras_propuestas: form.acciones_futuras_propuestas,
                    requiere_nueva_nc: form.requiere_nueva_nc ? 1 : 0,
                    estado_accion: form.estado_accion
                  }
                  const res = await fetchWithAuth(`/api/acciones/${action.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                  if(res.ok){
                    const updated = await res.json()
                    setThreads(prev => prev.map(t => Number(t.id) === Number(updated.id) ? updated : t))
                    showToast({ title: 'Acción guardada', message: 'Cambios guardados', type: 'success' })
                    setOpenEdit(false)
                  }else{
                    const err = await res.json().catch(()=>null)
                    showToast({ title: 'Error', message: getErrorText(err, 'No se pudo guardar acción'), type: 'error' })
                  }
                }catch(e){ console.error('save edit action error', e); showToast({ title: 'Error', message: 'Error al guardar acción', type: 'error' }) }
              }} className="px-3 py-1 bg-[#00236f] text-white text-sm rounded">Guardar</button>
              <button onClick={()=>setOpenEdit(false)} className="px-3 py-1 border rounded text-sm">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default function NCView(){
  const { id } = useParams()
  const [nc, setNc] = useState(null)
  const [threads, setThreads] = useState([])
  const [acceptState, setAcceptState] = useState('')
  const [flowState, setFlowState] = useState('')
  const [fechaVerificacion, setFechaVerificacion] = useState('')

  useEffect(()=>{
    // load NC details (backend not exposing single NC endpoint in all cases)
    const load = async ()=>{
      try{
        // try to fetch actions first
        const a = await fetchWithAuth(`/api/nc/${id}/acciones`)
        if(a.ok){
          const actions = await a.json()
          setThreads(actions || [])
        }
      }catch(e){ console.error('load actions error', e) }

      // load minimal NC info if endpoint exists (best-effort)
      try{
        const r = await fetchWithAuth(`/api/nc/${id}`)
        if(r.ok){
          const data = await r.json()
          setNc(data)
          setAcceptState(data.estado_validacion)
          setFlowState(data.estado_flujo)
        }else{
          // fallback placeholder if NC single endpoint not available
          const data = { id, estado_flujo: flowState || 'Abierta', estado_validacion: acceptState || 'Parcial', comentario_nc: '—' }
          setNc(data)
          setAcceptState(data.estado_validacion)
          setFlowState(data.estado_flujo)
        }
      }catch(e){
        const data = { id, estado_flujo: flowState || 'Abierta', estado_validacion: acceptState || 'Parcial', comentario_nc: '—' }
        setNc(data)
        setAcceptState(data.estado_validacion)
        setFlowState(data.estado_flujo)
      }
    }
    load()
  },[id])

  

  const { user } = useAuth()
  const roleLower = getRoleLower(user)
  const isResponsable = hasRole(user, 'responsable')
  const isEvaluador = hasRole(user, 'evaluador')

  const createChildAction = useCallback(async (parentId, payload) => {
    try {
      const body = {
        accion_previa_id: parentId,
        accion: payload.accion,
        contenido_comentario: payload.contenido_comentario,
        estado_accion: payload.estado_accion,
        acciones_futuras_propuestas: payload.acciones_futuras_propuestas || '',
        requiere_nueva_nc: payload.requiere_nueva_nc ? 1 : 0
      }
      const res = await fetchWithAuth(`/api/nc/${id}/acciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        const created = await res.json()
        setThreads(prev => [...prev, created])
        showToast({ title: 'Acción creada', message: 'Acción correctiva creada correctamente', type: 'success' })
      } else {
        const err = await res.json().catch(() => null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo crear acción'), type: 'error' })
      }
    } catch (e) { console.error('create action error', e); showToast({ title: 'Error', message: 'Error al crear acción', type: 'error' }) }
  }, [id])

  useEffect(()=>{
    const handler = (e) => {
      try{ createChildAction(null, e.detail) }catch(_){ }
    }
    window.addEventListener('nc:createRoot', handler)
    return ()=> window.removeEventListener('nc:createRoot', handler)
  }, [createChildAction])

  // color helpers and shadeColor are imported from ../lib/ncHelpers

  const [acceptOpen, setAcceptOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const acceptRef = useRef(null)
  const flowRef = useRef(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [draggingActionId, setDraggingActionId] = useState(null)
  const [dropState, setDropState] = useState('')
  const [savingActionId, setSavingActionId] = useState(null)
  const [viewMode, setViewMode] = useState('all') // 'all' | 'eficacia' | 'progreso'

  const actionsByState = useMemo(() => {
    return KANBAN_STATES.reduce((acc, state) => {
      acc[state] = (threads || [])
        .filter(t => (t.estado_accion || 'Pendiente') === state)
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
      return acc
    }, {})
  }, [threads])

  const updateActionState = useCallback(async (actionId, nextState) => {
    setSavingActionId(actionId)
    try {
      const res = await fetchWithAuth(`/api/acciones/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_accion: nextState })
      })
      if (res.ok) {
        const updated = await res.json()
        setThreads(prev => prev.map(t => Number(t.id) === Number(updated.id) ? updated : t))
        showToast({ title: 'Estado actualizado', message: `La acción pasó a ${formatKanbanState(nextState)}`, type: 'success' })
      } else {
        const err = await res.json().catch(() => null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo cambiar el estado'), type: 'error' })
      }
    } catch (e) {
      console.error('update action state error', e)
      showToast({ title: 'Error', message: 'No se pudo cambiar el estado', type: 'error' })
    } finally {
      setSavingActionId(null)
    }
  }, [])

  const loadHistoryForNC = async (ncId) => {
    setHistoryLoading(true)
    try{
      const res = await fetchWithAuth(`/api/acciones/hist?nc=${ncId}`)
      if(res.ok){
        const json = await res.json()
        setHistoryItems(json.items || [])
      }else{
        console.error('failed to load history', res.status)
        setHistoryItems([])
      }
    }catch(e){ console.error('loadHistory error', e); setHistoryItems([]) }
    setHistoryLoading(false)
  }

  // Confirm dialog state for deletions
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmCallback, setConfirmCallback] = useState(null)

  const performDeleteAction = useCallback(async (targetId) => {
    try {
      const res = await fetchWithAuth(`/api/acciones/${targetId}`, { method: 'DELETE' })
      if (res.ok) {
        setThreads(prev => {
          const toDelete = [targetId]
          for(let i=0;i<toDelete.length;i++){
            const cur = toDelete[i]
            prev.forEach(t=>{ if(t.accion_previa_id === cur) toDelete.push(t.id) })
          }
          return prev.filter(t => !toDelete.includes(t.id))
        })
        showToast({ title: 'Eliminado', message: 'Acción eliminada correctamente', type: 'success' })
      } else {
        const err = await res.json().catch(() => null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo eliminar acción'), type: 'error' })
      }
    } catch (e) { console.error('delete error', e); showToast({ title: 'Error', message: 'Error al eliminar', type: 'error' }) }
  }, [])

  const requestDeleteAction = useCallback((targetId) => {
    setConfirmTitle('Eliminar acción')
    setConfirmMessage('¿Confirmar eliminación de la acción y sus sub-acciones? Esta acción no se puede deshacer.')
    setConfirmCallback(()=>async ()=>{ performDeleteAction(targetId) })
    setConfirmOpen(true)
  }, [performDeleteAction])

  useEffect(()=>{
    const onDoc = (e) => {
      if(acceptRef.current && !acceptRef.current.contains(e.target)) setAcceptOpen(false)
      if(flowRef.current && !flowRef.current.contains(e.target)) setFlowOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[])

  const onChangeAccept = (e) => {
    const v = e.target.value
    setAcceptState(v)
    console.log('change accept state', id, v)
  }

  const onChangeFlow = (e) => {
    const v = e.target.value
    setFlowState(v)
    console.log('change flow state', id, v)
    if(v === 'Verificación'){
      if(!fechaVerificacion){
        const d = new Date(Date.now() + 24*60*60*1000)
        const pad = n => String(n).padStart(2,'0')
        const local = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        setFechaVerificacion(local)
      }
    }
  }

  const saveNC = async () => {
    try{
      // Only include fields that are intentionally set to avoid sending empty strings
      const body = {}
      if(typeof flowState === 'string' && flowState.trim() !== '') body.estado_flujo = flowState
      if(flowState === 'Verificación'){
        if(!fechaVerificacion) return showToast({ title: 'Error', message: 'Debe elegir fecha y hora de verificación', type: 'error' })
        body.fecha_verificacion_eficacia = new Date(fechaVerificacion).toISOString()
      }
      // If evaluator/actor set the flow state to 'Cerrada', set verification date to now
      if(flowState === 'Cerrada'){
        body.fecha_verificacion_eficacia = new Date().toISOString()
      }
      if(typeof acceptState === 'string' && acceptState.trim() !== '') body.estado_validacion = acceptState
      const res = await fetchWithAuth(`/api/nc/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if(res.ok){
        const updated = await res.json()
        setNc(updated)
        showToast({ title: 'NC actualizada', message: 'Cambios guardados', type: 'success' })
      }else{
        const err = await res.json().catch(()=>null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo guardar NC'), type: 'error' })
      }
    }catch(e){ console.error('saveNC error', e); showToast({ title: 'Error', message: 'Error al guardar cambios', type: 'error' }) }
  }

  if(!nc) return <div className="p-4">Cargando NC...</div>

  return (
    <Layout title={`NC #${nc.id}`} sidebar={<NavBarISO/>}>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">No Conformidad #{nc.id}</h2>
            <p className="text-sm text-slate-600 mt-1">{nc.comentario_nc}</p>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <div className="relative flex flex-col items-end" ref={acceptRef}>
              <button
                onClick={()=>{ if(isResponsable){ setAcceptOpen(o=>!o); setFlowOpen(false) } }}
                className={`px-4 py-2 rounded text-white text-sm font-semibold ${validationColor(acceptState)} ${!isResponsable ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{minWidth:120, textAlign:'center'}}
                aria-disabled={!isResponsable}
              >{acceptState || '—'}</button>
              {acceptOpen && isResponsable && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50">
                  <button onClick={()=>{ setAcceptState('Acepto'); setAcceptOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Acepto</button>
                  <button onClick={()=>{ setAcceptState('Parcial'); setAcceptOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Parcial</button>
                  <button onClick={()=>{ setAcceptState('No Acepto'); setAcceptOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">No Acepto</button>
                </div>
              )}
            </div>

            <div className="relative flex flex-col items-end" ref={flowRef}>
              <button
                onClick={()=>{ if(isResponsable || isEvaluador){ setFlowOpen(o=>!o); setAcceptOpen(false) } }}
                className={`px-4 py-2 rounded text-white text-sm font-semibold ${flowColor(flowState)} ${ (isResponsable || isEvaluador) ? 'border-transparent hover:border-black hover:shadow-sm cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                style={{minWidth:120, textAlign:'center'}}
                aria-disabled={!(isResponsable || isEvaluador)}
              >{flowState || '—'}</button>
              {flowOpen && (isResponsable || isEvaluador) && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow z-50">
                  {isEvaluador && (
                    <>
                      <button onClick={()=>{ setFlowState('Abierta'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Abierta</button>
                      <button onClick={()=>{ setFlowState('Verificación'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Verificación</button>
                      <button onClick={()=>{ setFlowState('Cerrada'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Cerrada</button>
                    </>
                  )}
                  {isResponsable && (
                    <>
                      <button onClick={()=>{ setFlowState('Análisis'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Análisis</button>
                      <button onClick={()=>{ setFlowState('Ejecución'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Ejecución</button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Fecha de verificación input shown to evaluador when Verificación selected */}
            {isEvaluador && flowState === 'Verificación' && (
              <div className="mt-2 w-full">
                <label className="text-xs">Fecha y hora de verificación</label>
                <input type="datetime-local" value={fechaVerificacion} onChange={e=>setFechaVerificacion(e.target.value)} className="w-full p-1 border rounded mt-1" />
              </div>
            )}
            <div>
              <button onClick={saveNC} className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm">Guardar cambios</button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Hilos de acciones correctivas</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode('all')} className={`px-3 py-1 rounded text-sm ${viewMode==='all' ? 'bg-slate-200' : 'bg-white'}`}>Ver todo</button>
                <button onClick={() => setViewMode('eficacia')} className={`px-3 py-1 rounded text-sm ${viewMode==='eficacia' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}>Ver Eficacia</button>
                <button onClick={() => setViewMode('progreso')} className={`px-3 py-1 rounded text-sm ${viewMode==='progreso' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}>Ver Progreso</button>
              </div>
              <button onClick={() => { setHistoryOpen(true); loadHistoryForNC(id); }} className="px-3 py-1 border rounded text-sm">Historial</button>
            </div>
          </div>
          {/* Create root action button + form */}
          <div className="mt-3 mb-3">
            <CreateRootAction />
          </div>
          <div className="mb-3 text-xs text-slate-500">
            Arrastra una tarjeta a otra columna para cambiar su estado. Las acciones conservan sus funciones de edición, creación de hijas e historial.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
            {KANBAN_STATES.filter(s => {
              if(viewMode === 'all') return true
              if(viewMode === 'eficacia') return ['Eficaz','No_Eficaz'].includes(s)
              if(viewMode === 'progreso') return ['Pendiente','En_Progreso'].includes(s)
              return true
            }).map(state => {
              const items = actionsByState[state] || []
              const isOver = dropState === state
              return (
                <div
                  key={state}
                  onDragOver={(e)=>{ e.preventDefault(); setDropState(state) }}
                  onDragLeave={()=>{ setDropState(curr => curr === state ? '' : curr) }}
                  onDrop={async (e)=>{
                    e.preventDefault()
                    setDropState('')
                    // prefer dataTransfer id (more reliable across browsers)
                    let draggingId = null
                    try{ draggingId = e.dataTransfer.getData('text/plain') }catch(_){ draggingId = null }
                    if(!draggingId) draggingId = draggingActionId
                    if(draggingId != null && draggingId !== '') await updateActionState(draggingId, state)
                    setDraggingActionId(null)
                  }}
                  className={`rounded-xl border bg-slate-50 p-2 min-h-[12rem] ${isOver ? 'ring-2 ring-blue-300 border-blue-300' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between px-1 pb-2">
                    <div className="font-semibold text-sm">{formatKanbanState(state)}</div>
                    <div className="text-xs px-2 py-0.5 rounded-full bg-white border">{items.length}</div>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                        Sin acciones
                      </div>
                    ) : items.map(action => (
                      <ActionCard 
                        key={action.id} 
                        action={action} 
                        threads={threads}
                        user={user}
                        createChildAction={createChildAction}
                        savingActionId={savingActionId}
                        draggingActionId={draggingActionId}
                        setDraggingActionId={setDraggingActionId}
                        setDropState={setDropState}
                        setThreads={setThreads}
                        onRequestDelete={requestDeleteAction} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Historial de acciones - NC #{nc.id}</h4>
              <div>
                <button onClick={()=>setHistoryOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
              </div>
            </div>
            <div className="h-64 overflow-auto border rounded p-2 bg-slate-50">
              {historyLoading ? (
                <div>Cargando...</div>
              ) : historyItems.length === 0 ? (
                <div className="text-sm text-slate-500">No hay registros de historial.</div>
              ) : (
                <ul className="space-y-2">
                  {historyItems.map(h => (
                    <li key={h.id} className="p-2 border rounded bg-white">
                      <div className="text-sm"><strong>{h.usuario_nombre || 'Sistema'}</strong> — <span className="text-slate-500 text-xs">{new Date(h.fecha_snapshot).toLocaleString()}</span></div>
                      <div className="text-sm mt-1">{h.estado_anterior} → <strong>{h.estado_nuevo}</strong></div>
                      {h.comentario ? <div className="mt-1 text-sm text-slate-700">{h.comentario}</div> : null}
                      <div className="mt-1 text-xs text-slate-400">Acción: {h.accion || h.accion_id} — NC: {h.nc}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={confirmOpen} title={confirmTitle} message={confirmMessage} confirmText="Eliminar" cancelText="Cancelar" onConfirm={async ()=>{ setConfirmOpen(false); try{ if(confirmCallback) await confirmCallback(); }catch(e){ console.error('confirm callback error', e) } finally{ setConfirmCallback(null) } }} onCancel={()=>{ setConfirmOpen(false); setConfirmCallback(null) }} />
    </Layout>
  )
}

// loadHistoryForNC moved inside component


// EditableEstado and CreateRootAction moved to separate components
