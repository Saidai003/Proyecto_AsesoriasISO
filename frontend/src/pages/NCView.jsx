import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import NavBarISO from '../components/NavBarISO'
import fetchWithAuth from '../lib/api'
import { showToast } from '../lib/toast'
import getErrorText from '../lib/errorMessage'
import { useAuth } from '../AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { hasRole } from '../lib/userUtils'
import { validationColor, flowColor } from '../lib/ncHelpers'
import CreateRootAction from '../components/CreateRootAction'
import ActionKanbanBoard from '../components/ActionKanbanBoard'

export default function NCView(){
  const { id } = useParams()
  const [nc, setNc] = useState(null)
  const [threads, setThreads] = useState([])
  const [acceptState, setAcceptState] = useState('')
  const [flowState, setFlowState] = useState('')
  const [fechaVerificacion, setFechaVerificacion] = useState('')
  const [commentText, setCommentText] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [ncHistoryOpen, setNcHistoryOpen] = useState(false)
  const [ncHistoryItems, setNcHistoryItems] = useState([])
  const [ncHistoryLoading, setNcHistoryLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [confirmCallback, setConfirmCallback] = useState(null)

  // Cargar datos de NC y acciones
  useEffect(()=>{
    const load = async ()=>{
      try{
        // what is 'a'?: it's a response from the fetchWithAuth function
        const a = await fetchWithAuth(`/api/nc/${id}/acciones`)
        if(a.ok){
          const actions = await a.json()
          setThreads(actions || [])
        }
      }catch(e){ console.error('load actions error', e) }

      try {
        const r = await fetchWithAuth(`/api/nc/${id}`)
        if (r.ok) {
          const data = await r.json()
          setNc(data)
          setAcceptState(data.estado_validacion)
          setFlowState(data.estado_flujo)
          setCommentText(data.comentario_nc || '')
          if(data.fecha_verificacion_eficacia){
            // Backend lo devuelve como ISO string en UTC → convertir a datetime-local
            const d = new Date(data.fecha_verificacion_eficacia)
            if(!Number.isNaN(d.getTime())){
              const pad = (n) => String(n).padStart(2, '0')
              setFechaVerificacion(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
            }
          }
        } else if (r.status === 404 || r.status === 403) {
          showToast({ title: 'Acceso Denegado', message: 'La NC no existe o no tienes permisos para verla.', type: 'error' })
          setNc(null) 
        } else {
          showToast({ title: 'Error', message: 'No se pudo cargar la información de la NC.', type: 'error' })
          setNc(null)
        }
      } catch(e) {
        console.error('Error de conexión al cargar NC:', e)
        showToast({ title: 'Error', message: 'Error de red al intentar cargar la NC.', type: 'error' })
        setNc(null)
      }
    }
    load()
  },[id])

  const { user } = useAuth()
  const isResponsable = hasRole(user, 'responsable')
  const isEvaluador = hasRole(user, 'evaluador')
  const isAdmin = hasRole(user, 'admin')
  const canEditComment = isEvaluador || isAdmin

  const createChildAction = async (parentId, payload) => {
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
        return
      }
      const err = await res.json().catch(() => null)
      showToast({ title: 'Error', message: getErrorText(err, 'No se pudo crear acción'), type: 'error' })
    } catch (e) {
      console.error('create action error', e)
      showToast({ title: 'Error', message: 'Error al crear acción', type: 'error' })
    }
  }

  useEffect(()=>{
    const handler = (e) => {
      try{ createChildAction(null, e.detail) }catch(_){ }
    }
    window.addEventListener('nc:createRoot', handler)
    return ()=> window.removeEventListener('nc:createRoot', handler)
  },[id])

  const [acceptOpen, setAcceptOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const acceptRef = useRef(null)
  const flowRef = useRef(null)

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

  const loadNCHistory = async (ncId) => {
    setNcHistoryLoading(true)
    try{
      const res = await fetchWithAuth(`/api/nc/${ncId}/hist`)
      if(res.ok){
        const json = await res.json()
        setNcHistoryItems(json || [])
      }else{
        console.error('failed to load nc history', res.status)
        setNcHistoryItems([])
      }
    }catch(e){ console.error('loadNCHistory error', e); setNcHistoryItems([]) }
    setNcHistoryLoading(false)
  }

  const performDeleteAction = async (targetId) => {
    try{
      const res = await fetchWithAuth(`/api/acciones/${targetId}`, { method: 'DELETE' })
      if(res.ok){
        const json = await res.json().catch(()=>({}))
        const deletedIds = new Set((json.deletedIds || [targetId]).map(Number))
        setThreads(prev => prev.filter(t => !deletedIds.has(Number(t.id))))
        showToast({ title: 'Acción eliminada', message: 'La acción y sus sub-acciones fueron eliminadas', type: 'success' })
      }else{
        const err = await res.json().catch(()=>null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo eliminar la acción'), type: 'error' })
      }
    }catch(e){
      console.error('delete action error', e)
      showToast({ title: 'Error', message: 'Error al eliminar la acción', type: 'error' })
    }
  }

  const requestDeleteAction = (targetId) => {
    setConfirmTitle('Eliminar acción')
    setConfirmMessage('¿Confirmar eliminación de la acción y sus sub-acciones? Esta acción no se puede deshacer.')
    setConfirmCallback(()=>async ()=>{ await performDeleteAction(targetId) })
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

  const saveNC = async () => {
    try{
      const body = {}
      if(typeof flowState === 'string' && flowState.trim() !== '') body.estado_flujo = flowState
      if(canEditComment){
        const trimmedComment = String(commentText || '').trimStart().trimEnd()
        body.comentario_nc = trimmedComment
        setCommentText(trimmedComment)
      }
      if(flowState === 'Verificación'){
        if(!fechaVerificacion) return showToast({ title: 'Error', message: 'Debe elegir fecha y hora de verificación', type: 'error' })
        body.fecha_verificacion_eficacia = new Date(fechaVerificacion).toISOString()
      }
      if(flowState === 'Cerrada'){
        const now = new Date()
        const pad = (n) => String(n).padStart(2, '0')
        body.fecha_verificacion_eficacia = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      }
      if(typeof acceptState === 'string' && acceptState.trim() !== '') body.estado_validacion = acceptState
      const res = await fetchWithAuth(`/api/nc/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if(res.ok){
        const updated = await res.json()
        setNc(updated)
        showToast({ title: 'NC actualizada', message: 'Cambios guardados', type: 'success' })
        const commentChanged = canEditComment && updated.comentario_nc !== nc.comentario_nc
        if(commentChanged && body.comentario_nc && body.comentario_nc.trimStart().trimEnd() !== ''){
          try{
            const requisitoId = nc?.requisito_base_id || updated.requisito_base_id || null
            await fetchWithAuth('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                requisito_id: requisitoId,
                nc_id: Number(id),
                contenido: body.comentario_nc,
                referencia_type: 'brecha',
                referencia_id: Number(id),
                metadata: { attachments: [{ type: 'brecha', id: Number(id), title: updated.titulo || `Brecha #${id}` }] }
              })
            })
          }catch(chatError){
            console.error('failed to post brecha chat message', chatError)
          }
        }
      }else{
        const err = await res.json().catch(()=>null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo guardar NC'), type: 'error' })
      }
    }catch(e){ console.error('saveNC error', e); showToast({ title: 'Error', message: 'Error al guardar cambios', type: 'error' }) }
  }

  if(!nc) return <div className="p-4">Cargando NC...</div>

  return (
    <Layout title={nc.titulo} sidebar={<NavBarISO/>}>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Brecha #{nc.id}</h2>
            <div className="mt-2">
              <label className="text-sm font-medium text-slate-700">Comentario de la brecha</label>
              {canEditComment ? (
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={4}
                  className="w-full mt-2 p-3 border rounded-lg resize-none"
                  placeholder="Agrega un comentario sobre la brecha"
                />
              ) : (
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{nc.comentario_nc || 'Descripción de la Brecha / Falta de la Norma'}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            <div className="relative flex items-center gap-2" ref={acceptRef}>
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Estado de aprobación</span>
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

            <div className="relative flex items-center gap-2" ref={flowRef}>
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Estado de proceso</span>
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
                      <button onClick={()=>{ setFlowState('Abierta'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Abierta</button>
                      <button onClick={()=>{ setFlowState('Análisis'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Análisis</button>
                      <button onClick={()=>{ setFlowState('Ejecución'); setFlowOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-slate-100">Ejecución</button>
                    </>
                  )}
                </div>
              )}
            </div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Plan de Implementación (Acciones Correctivas)</h3>
            <div className="flex gap-2">
              <button onClick={() => { setHistoryOpen(true); loadHistoryForNC(id); }} className="px-3 py-1 border rounded text-sm">Historial acciones</button>
              <button onClick={() => { setNcHistoryOpen(true); loadNCHistory(id); }} className="px-3 py-1 border rounded text-sm">Historial de la Brecha</button>
            </div>
          </div>
          
          <div className="mb-3">
            <CreateRootAction />
          </div>

          <ActionKanbanBoard
            threads={threads}
            setThreads={setThreads}
            ncId={id}
            user={user}
            onRequestDelete={requestDeleteAction}
          />
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Historial de acciones - {nc.titulo}</h4>
              <button onClick={()=>setHistoryOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
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

      {ncHistoryOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Historial de la Brecha #{nc.id}</h4>
              <button onClick={()=>setNcHistoryOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="h-64 overflow-auto border rounded p-2 bg-slate-50">
              {ncHistoryLoading ? (
                <div>Cargando...</div>
              ) : ncHistoryItems.length === 0 ? (
                <div className="text-sm text-slate-500">No hay registros de historial de la brecha.</div>
              ) : (
                <ul className="space-y-2">
                  {ncHistoryItems.map(h => (
                    <li key={h.id} className="p-3 border rounded bg-white">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold">{h.usuario_nombre || 'Sistema'}</div>
                        <div className="text-xs text-slate-500">{new Date(h.fecha_snapshot).toLocaleString()}</div>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-slate-700">
                        <div>Flujo: <strong>{h.estado_flujo || 'N/A'}</strong></div>
                        <div>Validación: <strong>{h.estado_validacion || 'N/A'}</strong></div>
                        {h.fecha_verificacion_eficacia ? <div>Fecha verificación: <strong>{new Date(h.fecha_verificacion_eficacia).toLocaleDateString()}</strong></div> : null}
                        {h.comentario ? <div>Comentario: {h.comentario}</div> : null}
                        <div className="text-xs text-slate-400">NC: {h.nc_id}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog 
        open={confirmOpen} 
        title={confirmTitle} 
        message={confirmMessage} 
        confirmText="Eliminar" 
        cancelText="Cancelar" 
        onConfirm={async ()=>{ 
          setConfirmOpen(false)
          try{ 
            if(confirmCallback) await confirmCallback()
          }catch(e){ 
            console.error('confirm callback error', e) 
          } finally{ 
            setConfirmCallback(null) 
          } 
        }} 
        onCancel={()=>{ 
          setConfirmOpen(false)
          setConfirmCallback(null) 
        }} 
      />
    </Layout>
  )
}
