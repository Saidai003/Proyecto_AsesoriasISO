import React from 'react'
import Protected from '../components/Protected'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import SearchInput from '../components/SearchInput'
import useUsers from '../hooks/useUsers'
import useWorkspaces from '../hooks/useWorkspaces'

function SideNav() {
  return (
      <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col py-4 border-r">
      <div className="mb-10 px-6">
        <h1 className="text-lg font-black text-blue-900">GAP Análisis</h1>
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">ISO 9001:2015 Portal</p>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        <a className="flex items-center gap-3 py-3 text-slate-600 font-medium pl-4" href="#">Panel Principal</a>
        <a className="flex items-center gap-3 py-3 text-slate-600 font-medium pl-4" href="#">Espacios de Trabajo</a>
        <a className="flex items-center gap-3 py-3 text-blue-900 font-bold pl-4 bg-slate-100 border-l-4 border-blue-900" href="#">Usuarios</a>
      </nav>
    </aside>
  )
}

export default function UsersManager() {
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState({ nombre: '', email: '', password: '', workspace_id: null })
  const [message, setMessage] = React.useState(null)
  const { users, loading, loadUsers, createUser, updateUser, deleteUser, assignWorkspace } = useUsers()
  const { workspaces, loadWorkspaces } = useWorkspaces()

  React.useEffect(()=>{ loadUsers() }, [loadUsers])
  React.useEffect(()=>{ loadWorkspaces() }, [loadWorkspaces])

  const [hoveredWorkspaceRow, setHoveredWorkspaceRow] = React.useState(null)

  async function handleCreate(e){
    // e could be called any name really
    // but it's common to call it 'e' as a convention for 'event'
    e.preventDefault()
    // we set message to null to clear
    // any previous message before we attempt to create a new user
    setMessage(null)
    try{
      await createUser(form) 
      // Why don't we simply put the whole form in the message text? 
      // Because the form contains the password, and we don't want to 
      // display that in the success message. 
      // Instead, we just show a generic success message.
      // Besides, the form data is already reflected in the users list,
      // so there's no need to repeat it in the message.
      setMessage({ type: 'success', text: 'Usuario creado' })
      // we clean the form after successful creation to reset the
      // input fields
      setForm({ nombre: '', email: '', password: '', workspace_id: null })
      setCreating(false)
    }catch(err){
      setMessage({ type: 'error', text: (err && err.error) ? err.error : (err.message || 'Error') })
    }
  }

  async function handleDelete(id){
    if(!confirm('Eliminar usuario?')) return
    try{
      await deleteUser(id)
      setMessage({ type: 'success', text: 'Usuario eliminado' })
    }catch(err){ setMessage({ type: 'error', text: err.error || 'Error eliminando' }) }
  }

  const [editingId, setEditingId] = React.useState(null)
  const [editForm, setEditForm] = React.useState({ nombre: '', email: '', password: '' })

  function startEdit(user){
    setEditingId(user.id)
    setEditForm({ nombre: user.nombre || '', email: user.email || '', password: '', workspace_id: user.workspace_id || null })
    setMessage(null)
  }

  function cancelEdit(){
    setEditingId(null)
    setEditForm({ nombre: '', email: '', password: '', workspace_id: null })
  }

  async function saveEdit(id){
    setMessage(null)
    try{
      const payload = { nombre: editForm.nombre, email: editForm.email, workspace_id: (typeof editForm.workspace_id !== 'undefined' ? editForm.workspace_id : null) }
      if(editForm.password && editForm.password.trim() !== '') payload.password = editForm.password
      await updateUser(id, payload)
      setMessage({ type: 'success', text: 'Usuario actualizado' })
      cancelEdit()
    }catch(err){ setMessage({ type: 'error', text: err.error || 'Error actualizando' }) }
  }

  async function handleAssign(user){
    const wid = prompt('Workspace ID (vacío para desasignar)', user.workspace_id || '')
    if(wid === null) return
    const workspace_id = wid === '' ? null : Number(wid)
    try{
      await assignWorkspace(user.id, workspace_id)
      setMessage({ type: 'success', text: 'Asignación actualizada' })
    }catch(err){ setMessage({ type: 'error', text: err.error || 'Error asignando' }) }
  }

  return (
    <Protected role="Admin">
      <Layout title="Gestor de Usuarios" subtitle="Administración de accesos y perfiles del sistema ISO 9001." sidebar={<SideNav/>}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-blue-900">Gestor de Usuarios</h2>
              <p className="text-on-secondary-fixed-variant">Administración de accesos y perfiles del sistema ISO 9001.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setCreating(c=>!c)} aria-label="Agregar usuario" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow">{creating ? 'Cancelar' : 'Agregar Usuario'}</button>
            </div>
          </div>
          {creating && (
            <form onSubmit={handleCreate} className="mb-6 bg-white p-4 rounded shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre" className="px-3 py-2 border rounded" />
                <input required value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email" className="px-3 py-2 border rounded" />
                <input required value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Password" type="password" className="px-3 py-2 border rounded" />
                <select value={form.workspace_id || ''} onChange={e=>setForm(f=>({...f,workspace_id: e.target.value === '' ? null : Number(e.target.value)}))} className="px-3 py-2 border rounded">
                  <option value="">Sin workspace</option>
                  {workspaces && workspaces.map(w=> (<option key={w.id} value={w.id}>{w.nombre_cliente || w.nombre || w.id}</option>))}
                </select>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Crear</button>
                <button type="button" onClick={()=>{setCreating(false); setForm({nombre:'',email:'',password:'', workspace_id: null})}} className="px-4 py-2 border rounded">Cancelar</button>
              </div>
              {message && <p className={`mt-2 ${message.type==='error'?'text-red-600':'text-green-600'}`}>{message.text}</p>}
            </form>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Usuarios" value="148" note="+12 este mes" />
          </div>
          <div className="mb-6 max-w-md">
            <SearchInput placeholder="Buscar usuarios por nombre o email..." />
          </div>
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center">
              <div>
                <button className="px-3 py-1.5 text-xs font-bold">Filtrar</button>
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Mostrando 10 de 148 usuarios</div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Nombre y Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Rol</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Workspace / Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && <tr><td colSpan={5} className="px-6 py-6">Cargando...</td></tr>}
                {!loading && users.map(u=> (
                  <tr key={u.id} className="hover:bg-surface-container-low">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">{(u.nombre||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                        <div className="w-full">
                          {editingId === u.id ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input value={editForm.nombre} onChange={e=>setEditForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre" className="px-3 py-2 border rounded w-full" />
                              <input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} placeholder="Email" className="px-3 py-2 border rounded w-full" />
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-blue-900">{u.nombre}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-container">{u.role_id || 'User'}</span></td>
                    <td onMouseEnter={()=>setHoveredWorkspaceRow(u.id)} onMouseLeave={()=>setHoveredWorkspaceRow(null)} className="px-6 py-5">
                      {editingId === u.id ? (
                        <div>
                          {(hoveredWorkspaceRow === u.id) ? (
                            <select value={editForm.workspace_id ?? ''} onChange={e=>setEditForm(f=>({...f,workspace_id: e.target.value === '' ? null : Number(e.target.value)}))} className="px-3 py-2 border rounded">
                              <option value="">Sin workspace</option>
                              {workspaces && workspaces.map(w=> (<option key={w.id} value={w.id}>{w.nombre_cliente || w.nombre || w.id}</option>))}
                            </select>
                          ) : (
                            <p className="text-sm font-medium">{u.workspace_id || '-'}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm font-medium">{u.workspace_id || '-'}</p>
                      )}
                    </td>
                    <td className="px-6 py-5"><span className="text-xs font-bold text-blue-900">Activo</span></td>
                    <td className="px-6 py-5 text-right">
                      {editingId === u.id ? (
                        <div className="flex justify-end items-center gap-2">
                          <input placeholder="Nueva contraseña (opcional)" type="password" value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))} className="px-3 py-2 border rounded" />
                          <button onClick={()=>saveEdit(u.id)} className="px-3 py-1.5 bg-primary text-white rounded-lg">Guardar</button>
                          <button onClick={cancelEdit} className="px-3 py-1.5 border rounded-lg">Cancelar</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <button onClick={()=>startEdit(u)} className="p-2">Editar</button>
                          <button onClick={()=>handleAssign(u)} className="px-3 py-1.5 bg-tertiary-container rounded-lg">Asignar</button>
                          <button onClick={()=>handleDelete(u.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg">Eliminar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-8 py-6 bg-surface-container-low/30 flex justify-between items-center">
              <p className="text-xs font-medium text-slate-500">Página 1 de 15</p>
              <div className="flex gap-2"><button className="px-4 py-2 bg-white text-slate-400 rounded-lg">Anterior</button><button className="px-4 py-2 bg-white text-primary rounded-lg">Siguiente</button></div>
            </div>
          </div>
        </div>
      </Layout>
    </Protected>
  )
}
