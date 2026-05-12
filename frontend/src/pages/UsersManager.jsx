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
  const [message, setMessage] = React.useState(null)
  const { users, loading, loadUsers, createUser, updateUser, deleteUser, assignWorkspace } = useUsers()
  const { workspaces, loadWorkspaces } = useWorkspaces()

  const ROLE_OPTIONS = [
    { id: 1, label: 'Administrador' },
    { id: 2, label: 'Evaluador' },
    { id: 3, label: 'Responsable SGC' }
  ]

  React.useEffect(()=>{ loadUsers() }, [loadUsers])
  React.useEffect(()=>{ loadWorkspaces() }, [loadWorkspaces])

  

  async function handleDelete(id){
    if(!confirm('Eliminar usuario?')) return
    try{
      await deleteUser(id)
      setMessage({ type: 'success', text: 'Usuario eliminado' })
    }catch(err){ setMessage({ type: 'error', text: err.error || 'Error eliminando' }) }
  }

  const [editingId, setEditingId] = React.useState(null)
  const [editForm, setEditForm] = React.useState({ nombre: '', email: '', password: '', workspace_id: null, role_id: null })

  const [newRow, setNewRow] = React.useState(false)
  const [newForm, setNewForm] = React.useState({ nombre: '', email: '', password: '', workspace_id: null, role_id: null })

  function startEdit(user){
    setEditingId(user.id)
    setEditForm({ nombre: user.nombre || '', email: user.email || '', password: '', workspace_id: user.workspace_id || null, role_id: user.role_id || null })
    setMessage(null)
  }

  function cancelEdit(){
    setEditingId(null)
    setEditForm({ nombre: '', email: '', password: '', workspace_id: null })
  }

  async function saveEdit(id){
    setMessage({ type: 'info', text: 'Guardando...' })
    try{
      const payload = { nombre: editForm.nombre, email: editForm.email, workspace_id: (typeof editForm.workspace_id !== 'undefined' ? editForm.workspace_id : null), role_id: (typeof editForm.role_id !== 'undefined' ? editForm.role_id : null) }
      if(editForm.password && editForm.password.trim() !== '') payload.password = editForm.password
      console.log('saveEdit payload', id, payload)
      await updateUser(id, payload)
      setMessage({ type: 'success', text: 'Usuario actualizado' })
      cancelEdit()
    }catch(err){
      console.error('saveEdit error', err)
      const text = (err && (err.error || err.message)) ? (err.error || err.message) : (typeof err === 'string' ? err : JSON.stringify(err))
      setMessage({ type: 'error', text: text || 'Error actualizando' })
    }
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
          {message && (
            <div className={`mb-4 px-6 py-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              {message.text}
            </div>
          )}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-blue-900">Gestor de Usuarios</h2>
              <p className="text-on-secondary-fixed-variant">Administración de accesos y perfiles del sistema ISO 9001.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Primary actions placeholder */}
            </div>
          </div>
          
                

            <div className="px-8 py-6 bg-surface-container-low/30 flex justify-between items-center">
            <StatCard title="Total Usuarios" value="148" note="+12 este mes" />
          </div>
          <div className="mb-6 max-w-md">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-2 bg-primary text-white rounded-lg">Exportar</button>
                </div>
            <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center">
              {/* Add new user button below table, right-aligned */}
              <div className="flex justify-end mt-4">
                <button onClick={()=>setNewRow(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow">{newRow ? 'Nueva fila' : 'Agregar Usuario'}</button>
              </div>
              <div>
                <button className="px-3 py-1.5 text-xs font-bold">Filtrar</button>
              </div>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Mostrando 10 de 148 usuarios</div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                  <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Nombre</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Rol</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Workspace / Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading && <tr><td colSpan={6} className="px-6 py-6">Cargando...</td></tr>}
                {newRow && (
                  <tr className="bg-surface-container-low">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">+</div>
                        <div>
                          <input value={newForm.nombre} onChange={e=>setNewForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre" className="px-3 py-2 border rounded w-48" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input value={newForm.email} onChange={e=>setNewForm(f=>({...f,email:e.target.value}))} placeholder="Email" className="px-3 py-2 border rounded w-64" />
                    </td>
                    <td className="px-6 py-4">
                      <select value={newForm.role_id ?? ''} onChange={e=>setNewForm(f=>({...f,role_id: e.target.value === '' ? null : Number(e.target.value)}))} className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-container">
                        <option value="">Sin rol</option>
                        {ROLE_OPTIONS.map(r=> (<option key={r.id} value={r.id}>{r.label}</option>))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select value={newForm.workspace_id ?? ''} onChange={e=>setNewForm(f=>({...f,workspace_id: e.target.value === '' ? null : Number(e.target.value)}))} className="px-3 py-2 border rounded">
                        <option value="">Sin workspace</option>
                        {workspaces && workspaces.map(w=> (<option key={w.id} value={w.id}>{w.nombre_cliente || w.nombre || w.id}</option>))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <input placeholder="Password (opcional)" type="password" value={newForm.password} onChange={e=>setNewForm(f=>({...f,password:e.target.value}))} className="px-3 py-2 border rounded" />
                        <button onClick={async ()=>{ try{ await createUser(newForm); setMessage({type:'success', text:'Usuario creado'}); setNewRow(false); setNewForm({ nombre: '', email: '', password: '', workspace_id: null }) }catch(err){ setMessage({type:'error', text: err.error || err.message || 'Error'}) } }} className="px-4 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap">Enviar</button>
                        <button onClick={()=>{ setNewRow(false); setNewForm({ nombre: '', email: '', password: '', workspace_id: null }) }} className="px-4 py-2 border rounded-lg whitespace-nowrap">Descartar</button>
                      </div>
                    </td>
                    <td className="px-6 py-4" />
                  </tr>
                )}
                {!loading && users.map(u=> (
                  <tr key={u.id} className="hover:bg-surface-container-low">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">{(u.nombre||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                        <div>
                          {editingId === u.id ? (
                            <input value={editForm.nombre} onChange={e=>setEditForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre" className="px-3 py-2 border rounded w-full max-w-[260px]" />
                          ) : (
                            <p className="text-sm font-bold text-blue-900">{u.nombre}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {editingId === u.id ? (
                        <input value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))} placeholder="Email" className="px-3 py-2 border rounded w-full max-w-[320px]" />
                      ) : (
                        <p className="text-xs text-slate-500">{u.email}</p>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {editingId === u.id ? (
                        <select value={editForm.role_id ?? ''} onChange={e=>setEditForm(f=>({...f,role_id: e.target.value === '' ? null : Number(e.target.value)}))} className="px-3 py-2 border rounded">
                          <option value="">Sin rol</option>
                          {ROLE_OPTIONS.map(r=> (<option key={r.id} value={r.id}>{r.label}</option>))}
                        </select>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-container">{(ROLE_OPTIONS.find(ro=>ro.id === u.role_id) || { label: (typeof u.role_id === 'string' ? u.role_id : 'User') }).label}</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      {editingId === u.id ? (
                        <select value={editForm.workspace_id ?? ''} onChange={e=>setEditForm(f=>({...f,workspace_id: e.target.value === '' ? null : Number(e.target.value)}))} className="px-3 py-2 border rounded">
                          <option value="">Sin workspace</option>
                          {workspaces && workspaces.map(w=> (<option key={w.id} value={w.id}>{w.nombre_cliente || w.nombre || w.id}</option>))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium">{(workspaces && workspaces.find(w=>w.id === u.workspace_id) ? (workspaces.find(w=>w.id === u.workspace_id).nombre_cliente || workspaces.find(w=>w.id === u.workspace_id).nombre) : (u.workspace_id || '-'))}</p>
                      )}
                    </td>
                    <td className="px-6 py-5"><span className="text-xs font-bold text-blue-900">Activo</span></td>
                    <td className="px-6 py-5 text-right">
                      {editingId === u.id ? (
                        <div className="flex flex-wrap justify-end items-center gap-2">
                          <input placeholder="Nueva contraseña (opcional)" type="password" value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))} className="px-3 py-2 border rounded max-w-[180px]" />
                          <button onClick={()=>saveEdit(u.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Guardar</button>
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

            {/* bottom CTA removed to keep single create button at top */}
          </div>
        </div>
      </Layout>
    </Protected>
  )
}
