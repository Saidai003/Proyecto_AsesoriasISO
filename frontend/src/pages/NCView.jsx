import React, { useEffect, useState, useRef } from 'react'
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

  const createChildAction = (parentId, payload) => {
    // Persist action to backend
    ;(async ()=>{
      try{
        const body = {
          accion_previa_id: parentId,
          accion: payload.accion,
          contenido_comentario: payload.contenido_comentario,
          estado_accion: payload.estado_accion,
          acciones_futuras_propuestas: payload.acciones_futuras_propuestas || '',
          requiere_nueva_nc: payload.requiere_nueva_nc ? 1 : 0
        }
        const res = await fetchWithAuth(`/api/nc/${id}/acciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        if(res.ok){
          const created = await res.json()
          setThreads(prev => [...prev, created])
          showToast({ title: 'Acción creada', message: 'Acción correctiva creada correctamente', type: 'success' })
        }else{
          const err = await res.json().catch(()=>null)
          showToast({ title: 'Error', message: getErrorText(err, 'No se pudo crear acción'), type: 'error' })
        }
      }catch(e){ console.error('create action error', e); showToast({ title: 'Error', message: 'Error al crear acción', type: 'error' }) }
    })()
  }

  useEffect(()=>{
    const handler = (e) => {
      try{ createChildAction(null, e.detail) }catch(_){ }
    }
    window.addEventListener('nc:createRoot', handler)
    return ()=> window.removeEventListener('nc:createRoot', handler)
  },[])

  // color helpers and shadeColor are imported from ../lib/ncHelpers

  const [acceptOpen, setAcceptOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const acceptRef = useRef(null)
  const flowRef = useRef(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

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

  const performDeleteAction = (targetId) => {
    setThreads(prev => {
      const toDelete = [targetId]
      for(let i=0;i<toDelete.length;i++){
        const cur = toDelete[i]
        prev.forEach(t=>{ if(t.accion_previa_id === cur) toDelete.push(t.id) })
      }
      return prev.filter(t => !toDelete.includes(t.id))
    })
  }

  const requestDeleteAction = (targetId) => {
    setConfirmTitle('Eliminar acción')
    setConfirmMessage('¿Confirmar eliminación de la acción y sus sub-acciones? Esta acción no se puede deshacer.')
    setConfirmCallback(()=>async ()=>{ performDeleteAction(targetId) })
    setConfirmOpen(true)
  }

  useEffect(()=>{
    const onDoc = (e) => {
      if(acceptRef.current && !acceptRef.current.contains(e.target)) setAcceptOpen(false)
      if(flowRef.current && !flowRef.current.contains(e.target)) setFlowOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[])

  const ActionCard = ({ action, depth = 0, onRequestDelete }) => {
    
    const [openForm, setOpenForm] = useState(false)
    const [form, setForm] = useState({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '', requiere_nueva_nc: false })
    const children = threads.filter(t => t.accion_previa_id === action.id)
    const base = '#c3ddf7'
    const bg = shadeColor(base, -5 * depth)
    // deletion is handled by parent via onRequestDelete
    return (
      <div className="p-2 border rounded-lg shadow-sm" style={{ backgroundColor: bg, borderColor: depth>0 ? shadeColor('#9fbce8', -5*depth) : '#9fbce8' }}>
        {/* Top row: NC badge (left small) + Acción propuesta (right) */}
        <div className="flex gap-3">
          <div className="w-1/4">
            <div className="text-xs text-slate-500 mb-1">NC (NO CONFORMIDAD)</div>
            <div className="bg-slate-50 text-sm p-2 rounded h-12 flex items-center">{action.nc || `NC-${action.id}`}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-500 mb-1">ACCIÓN PROPUESTA</div>
            <div className="bg-slate-50 p-2 rounded h-12 text-sm overflow-hidden">{action.accion}</div>
          </div>
        </div>

        {/* Comentario full width */}
        <div className="mt-2">
          <div className="text-xs text-slate-500 mb-1">CONTENIDO DEL COMENTARIO</div>
          <div className="bg-slate-50 p-2 rounded h-12 text-sm overflow-hidden">{action.contenido_comentario || '—'}</div>
        </div>

        {/* Actions future + Estado (readonly) */}
        <div className="mt-2 flex gap-3 items-center">
          <div className="w-1/2">
            <div className="text-xs text-slate-500 mb-1">ACCIONES FUTURAS PROPUESTAS</div>
            <div className="bg-slate-50 p-2 rounded h-10 text-sm overflow-hidden">{action.acciones_futuras_propuestas || '—'}</div>
          </div>
          <div className="w-1/2">
            <div className="text-xs text-slate-500 mb-1">ESTADO DE LA ACCIÓN</div>
            {hasRole(user, 'responsable') ? (
              <EditableEstado action={action} onUpdated={(updated)=>{
                // update local threads
                setThreads(prev => prev.map(t => t.id === updated.id ? updated : t))
                showToast({ title: 'Acción actualizada', message: 'Estado guardado', type: 'success' })
              }} />
            ) : (
              <div className={`p-2 rounded h-10 text-sm flex items-center justify-center ${statusColor(action.estado_accion)}`}>{action.estado_accion}</div>
            )}
          </div>
        </div>

        {/* Footer row: vincular action select, delete (restricted to Responsables) */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div />
          <div className="flex items-center gap-3">
              {hasRole(user, 'responsable') && (
              <>
                <button onClick={()=>setOpenForm(o=>!o)} className="text-xs px-2 py-1 border rounded">Agregar acción hija</button>
                <button onClick={()=>{ if(typeof onRequestDelete === 'function'){ onRequestDelete(action.id) } }} className="text-xs text-red-600">Eliminar Acción</button>
              </>
            )}
          </div>
        </div>

        {/* Inline form for creating child (keeps same but compact) */}
        {openForm && (
          <div className="mt-3 p-3 border rounded bg-slate-50">
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

        {children.length>0 && (
          <div className="mt-3 pl-4 border-l">
            {children.map(c => <ActionCard key={c.id} action={c} depth={depth+1} onRequestDelete={onRequestDelete} />)}
          </div>
        )}
      </div>
    )
  }

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
            <div>
              <button onClick={() => { setHistoryOpen(true); loadHistoryForNC(id); }} className="px-3 py-1 border rounded text-sm">Historial</button>
            </div>
          </div>
          {/* Create root action button + form */}
          <div className="mt-3 mb-3">
            <CreateRootAction />
          </div>
          <div className="mt-3 space-y-3">
            {threads.filter(t=> !t.accion_previa_id).map(root => (
              <ActionCard key={root.id} action={root} onRequestDelete={requestDeleteAction} />
            ))}
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
