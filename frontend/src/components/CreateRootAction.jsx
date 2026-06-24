import React from 'react'
import { useAuth } from '../AuthContext'
import { hasRole } from '../lib/userUtils'

// Create a new root action
// What a root action?
// A root action is an action that is not a child of any other action. It is the top-level action in a hierarchy of actions.
// This component is responsible for creating a new root action. It emits a custom event that is handled by the parent component (NavBarISO) to actually create the action and refresh the list.
export default function CreateRootAction(){
  const { user } = useAuth()
  const isResponsable = hasRole(user, 'responsable')
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '' })
  // Emit custom event handled by parent component to create the root action
  const submit = ()=>{
    const ev = new CustomEvent('nc:createRoot', { detail: form })
    window.dispatchEvent(ev)
    setForm({ accion: '', contenido_comentario: '', estado_accion: 'Pendiente', acciones_futuras_propuestas: '' })
    setOpen(false)
  }
  if(!isResponsable) return null
  return (
    <div>
      {!open ? (
        <button onClick={()=>setOpen(true)} className="px-3 py-1 bg-[#00236f] text-white rounded">Asignar Nueva Acción / Tarea</button>
      ) : (
        <div className="p-3 border rounded bg-white">
          <div className="mb-2 text-sm text-yellow-800 bg-yellow-100 p-2 rounded">Nota: completa los campos con cuidado. Después de crear la acción, podrás editar título, comentario, estado y acciones futuras desde la tarjeta.</div>
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
