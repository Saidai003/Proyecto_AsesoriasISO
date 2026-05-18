import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import NavBarISO from '../components/NavBarISO'
import { useAuth } from '../AuthContext'
import { getRoleLower, hasRole } from '../lib/userUtils'

export default function NCView(){
  const { id } = useParams()
  const [nc, setNc] = useState(null)
  const [threads, setThreads] = useState([])
  const [acceptState, setAcceptState] = useState('')
  const [flowState, setFlowState] = useState('')

  useEffect(()=>{
    // Placeholder: load NC details (hardcoded for now)
    const data = {
      id: id,
      estado_flujo: 'Abierta',
      estado_validacion: 'Parcial',
      comentario_nc: 'Ejemplo: falta evidencia de control.'
    }
    setNc(data)
    setAcceptState(data.estado_validacion)
    setFlowState(data.estado_flujo)

    // Placeholder corrective actions (match ACCIONES_CORRECTIVAS table fields)
    setThreads([
      {
        id: 1,
        auditoria_nc_id: id,
        accion_previa_id: null,
        autor_id: 5,
        tipo_autor: 'Evaluador',
        nc: 'Referencia NC #101',
        accion: 'Actualizar procedimiento de control de entrada',
        contenido_comentario: 'Se identificó falta de control en recepción de materiales.',
        estado_accion: 'Pendiente',
        acciones_futuras_propuestas: 'Capacitación y actualización de instructivos',
        requiere_nueva_nc: 0,
        fecha_accion: '2026-05-10'
      },
      {
        id: 2,
        auditoria_nc_id: id,
        accion_previa_id: 1,
        autor_id: 8,
        tipo_autor: 'Responsable SGC',
        nc: 'Referencia NC #101',
        accion: 'Implementar verificación adicional en recepción',
        contenido_comentario: 'Se asignó responsable y plazo de implementación.',
        estado_accion: 'En_Progreso',
        acciones_futuras_propuestas: 'Revisión posterior a 30 días',
        requiere_nueva_nc: 0,
        fecha_accion: '2026-05-12'
      }
    ])
  },[id])

  

  const { user } = useAuth()
  const roleLower = getRoleLower(user)
  const isResponsable = hasRole(user, 'responsable')
  const isEvaluador = hasRole(user, 'evaluador')

  const createChildAction = (parentId, payload) => {
    // create a new id locally
    const maxId = threads.reduce((m,t)=> Math.max(m, t.id), 0)
    const newAction = {
      id: maxId + 1,
      auditoria_nc_id: id,
      accion_previa_id: parentId,
      autor_id: user?.id || 0,
      tipo_autor: user?.role || 'Responsable SGC',
      nc: `Referencia NC #${id}`,
      accion: payload.accion,
      contenido_comentario: payload.contenido_comentario,
      estado_accion: payload.estado_accion,
      acciones_futuras_propuestas: payload.acciones_futuras_propuestas || '',
      requiere_nueva_nc: payload.requiere_nueva_nc ? 1 : 0,
      fecha_accion: new Date().toISOString().slice(0,10)
    }
    setThreads(prev => [...prev, newAction])
  }

  useEffect(()=>{
    const handler = (e) => {
      try{ createChildAction(null, e.detail) }catch(_){ }
    }
    window.addEventListener('nc:createRoot', handler)
    return ()=> window.removeEventListener('nc:createRoot', handler)
  },[])

  function statusColor(status){
    switch(status){
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800'
      case 'En_Progreso': return 'bg-blue-600 text-white'
      case 'Eficaz': return 'bg-green-100 text-green-800'
      case 'No_Eficaz': return 'bg-red-100 text-red-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  function shadeColor(hex, percent) {
    const normalized = hex.replace('#','')
    const num = parseInt(normalized,16)
    let r = (num >> 16) & 0xFF
    let g = (num >> 8) & 0xFF
    let b = num & 0xFF
    const amt = Math.round(255 * (percent/100))
    r = Math.max(0, Math.min(255, r + amt))
    g = Math.max(0, Math.min(255, g + amt))
    b = Math.max(0, Math.min(255, b + amt))
    return `#${((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)}`
  }

  function validationColor(val){
    switch(val){
      case 'Acepto': return 'bg-green-600'
      case 'Parcial': return 'bg-yellow-500'
      case 'No Acepto': return 'bg-red-600'
      default: return 'bg-slate-400'
    }
  }

  function flowColor(val){
    switch(val){
      case 'Abierta': return 'bg-red-500'
      case 'Análisis': return 'bg-orange-500'
      case 'Ejecución': return 'bg-blue-600'
      case 'Verificación': return 'bg-emerald-600'
      case 'Cerrada': return 'bg-slate-600'
      default: return 'bg-slate-400'
    }
  }

  const [acceptOpen, setAcceptOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(false)
  const acceptRef = useRef(null)
  const flowRef = useRef(null)

  useEffect(()=>{
    const onDoc = (e) => {
      if(acceptRef.current && !acceptRef.current.contains(e.target)) setAcceptOpen(false)
      if(flowRef.current && !flowRef.current.contains(e.target)) setFlowOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=> document.removeEventListener('mousedown', onDoc)
  },[])

  const ActionCard = ({ action, depth = 0 }) => {
    const [openForm, setOpenForm] = useState(false)
    const [form, setForm] = useState({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '', requiere_nueva_nc: false })
    const children = threads.filter(t => t.accion_previa_id === action.id)
    const base = '#c3ddf7'
    const bg = shadeColor(base, -5 * depth)
    const deleteAction = (targetId) => {
      // collect target and all descendants
      const toDelete = [targetId]
      for(let i=0;i<toDelete.length;i++){
        const cur = toDelete[i]
        threads.forEach(t=>{ if(t.accion_previa_id === cur) toDelete.push(t.id) })
      }
      setThreads(prev => prev.filter(t => !toDelete.includes(t.id)))
    }
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
            <div className="text-xs text-slate-500 mb-1">ESTADO DE LA ACCIÓN (SOLO LECTURA)</div>
            <div className={`p-2 rounded h-10 text-sm flex items-center justify-center ${statusColor(action.estado_accion)}`}>{action.estado_accion}</div>
          </div>
        </div>

        {/* Footer row: vincular action select, delete (restricted to Responsables) */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div />
          <div className="flex items-center gap-3">
              {hasRole(user, 'responsable') && (
              <>
                <button onClick={()=>setOpenForm(o=>!o)} className="text-xs px-2 py-1 border rounded">Agregar acción hija</button>
                <button onClick={()=>deleteAction(action.id)} className="text-xs text-red-600">Eliminar Acción</button>
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
            {children.map(c => <ActionCard key={c.id} action={c} depth={depth+1} />)}
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
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-semibold">Hilos de acciones correctivas</h3>
          {/* Create root action button + form */}
          <div className="mt-3 mb-3">
            <CreateRootAction />
          </div>
          <div className="mt-3 space-y-3">
            {threads.filter(t=> !t.accion_previa_id).map(root => (
              <ActionCard key={root.id} action={root} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function CreateRootAction(){
  const { user } = useAuth()
  const isResponsable = hasRole(user, 'responsable')
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '', requiere_nueva_nc: false })
  // Emit custom event handled by parent component to create the root action
  const submit = ()=>{
  const ev = new CustomEvent('nc:createRoot', { detail: form })
  window.dispatchEvent(ev)
  setForm({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '', requiere_nueva_nc: false })
  setOpen(false)
  }
  if(!isResponsable) return null
  return (
  <div>
    {!open ? (
    <button onClick={()=>setOpen(true)} className="px-3 py-1 bg-[#00236f] text-white rounded">Crear acción correctiva</button>
    ) : (
    <div className="p-3 border rounded bg-white">
      <input placeholder="Acción" value={form.accion} onChange={e=>setForm({...form, accion: e.target.value})} className="w-full px-2 py-1 border rounded mb-2" />
      <textarea placeholder="Comentario" value={form.contenido_comentario} onChange={e=>setForm({...form, contenido_comentario: e.target.value})} className="w-full px-2 py-1 border rounded mb-2" />
      <div className="flex gap-2">
      <button onClick={submit} className="px-3 py-1 bg-[#00236f] text-white rounded">Crear</button>
      <button onClick={()=>setOpen(false)} className="px-3 py-1 border rounded">Cancelar</button>
      </div>
    </div>
    )}
  </div>
  )
}
