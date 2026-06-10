import React from 'react'
import { useAuth } from '../AuthContext'
import fetchWithAuth from '../lib/api'
import { showToast } from '../lib/toast'
import getErrorText from '../lib/errorMessage'
import { statusColor } from '../lib/ncHelpers'

export default function EditableEstado({ action, onUpdated }){
  const { user } = useAuth()
  const [editing, setEditing] = React.useState(false)
  const [state, setState] = React.useState(action.estado_accion || 'Pendiente')
  const [comentario, setComentario] = React.useState('')

  React.useEffect(()=>{
    setState(action.estado_accion || 'Pendiente')
  }, [action.estado_accion])

  const save = async ()=>{
    try{
      const payload = { estado_accion: state }
      if(comentario && comentario.trim()!=='') payload.comentario = comentario
      const res = await fetchWithAuth(`/api/acciones/${action.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if(res.ok){
        const updated = await res.json()
        onUpdated && onUpdated(updated)
        setEditing(false)
      }else{
        const err = await res.json().catch(()=>null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo actualizar'), type: 'error' })
      }
    }catch(e){ console.error('save estado error', e); showToast({ title: 'Error', message: 'Error al guardar estado', type: 'error' }) }
  }

  return (
    <div className="inline-flex items-center">
      {!editing ? (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusColor(action.estado_accion)}`}>
          <span>{action.estado_accion}</span>
          <button onClick={()=>setEditing(true)} className="text-[11px] px-2 py-0.5 border rounded-full bg-white/80 text-slate-700 hover:bg-white">
            Editar
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-white border p-2 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <select value={state} onChange={e=>setState(e.target.value)} className="px-2 py-1 border rounded text-sm">
              <option value="Pendiente">Pendiente</option>
              <option value="En_Progreso">En_Progreso</option>
              <option value="Eficaz">Eficaz</option>
              <option value="No_Eficaz">No_Eficaz</option>
            </select>
            <input placeholder="Comentario (opcional)" value={comentario} onChange={e=>setComentario(e.target.value)} className="px-2 py-1 border rounded text-sm flex-1" />
            <button onClick={save} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Guardar</button>
            <button onClick={()=>setEditing(false)} className="px-2 py-1 border rounded text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
