import React from 'react'
import Protected from '../components/Protected'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import SearchInput from '../components/SearchInput'
import useUsers from '../hooks/useUsers'
import useWorkspaces from '../hooks/useWorkspaces'
import ConfirmDialog from '../components/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { showToast } from '../lib/toast'

function SideNav() {
  return (
      <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 flex flex-col py-4 border-r">
      <div className="mb-10 px-6">
        <h1 className="text-lg font-black text-blue-900">GAP Análisis</h1>
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">ISO 9001:2015 Portal</p>
      </div>
      <nav className="flex-1 space-y-1 px-2">
        <Link className="flex items-center gap-3 py-3 text-slate-600 font-medium pl-4" to="/lobby">Panel Principal</Link>
        <Link className="flex items-center gap-3 py-3 text-slate-600 font-medium pl-4" to="/workspaces">Espacios de Trabajo</Link>
        <Link className="flex items-center gap-3 py-3 text-blue-900 font-bold pl-4 bg-slate-100 border-l-4 border-blue-900" to="/users">Usuarios</Link>
      </nav>
    </aside>
  )
}

export default function UsersManager() {
  const navigate = useNavigate()
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

  const [q, setQ] = React.useState('')
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showEditPassword, setShowEditPassword] = React.useState(false)
  const filteredUsers = React.useMemo(() => {
    if (!q) return users || []
    const s = q.toLowerCase()
    return (users || []).filter(u => {
      const name = (u.nombre || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const ws = workspaces && workspaces.find(w => w.id === u.workspace_id)
      const wsName = (ws?.nombre_cliente ?? '').toLowerCase()
      const role = (ROLE_OPTIONS.find(r => r.id === u.role_id)?.label ?? '').toLowerCase()
      return name.includes(s) || email.includes(s) || wsName.includes(s) || role.includes(s)
    })
  }, [users, q, workspaces])

  const pendingUsers = React.useMemo(() => (users || []).filter(u => u.estado_invitacion === 'Pendiente'), [users])

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmPayload, setConfirmPayload] = React.useState(null)
  function handleDeleteRequest(id){
    setConfirmPayload(id)
    setConfirmOpen(true)
  }
  async function handleDeleteConfirmed(){
    const id = confirmPayload
    setConfirmOpen(false)
    setConfirmPayload(null)
    try{
      await deleteUser(id)
      showToast({ title: 'Usuario eliminado', message: `El usuario ${id} fue eliminado`, type: 'success', ttl: 5000 })
    }catch(err){ setMessage({ type: 'error', text: err.error || 'Error eliminando' }) }
  }

  const [editingId, setEditingId] = React.useState(null)

  const [newRow, setNewRow] = React.useState(false)

  const {
    register: registerNew,
    handleSubmit: handleNewSubmit,
    reset: resetNew,
  } = useForm({ defaultValues: { nombre: '', email: '', password: '', workspace_id: '', role_id: '' } })

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
  } = useForm({ defaultValues: { nombre: '', email: '', password: '', workspace_id: '', role_id: '' } })

  function startEdit(user){
    setEditingId(user.id)
    setShowEditPassword(false)
    resetEdit({ nombre: user.nombre || '', email: user.email || '', password: '', workspace_id: user.workspace_id ?? '', role_id: user.role_id ?? '' })
    setMessage(null)
  }

  function cancelEdit(){
    setEditingId(null)
    setShowEditPassword(false)
    resetEdit({ nombre: '', email: '', password: '', workspace_id: '', role_id: '' })
  }

  async function saveEdit(id, data){
    setMessage({ type: 'info', text: 'Guardando...' })
    try{
      const payload = { nombre: data.nombre, email: data.email, workspace_id: (data.workspace_id === '' ? null : Number(data.workspace_id)), role_id: (data.role_id === '' ? null : Number(data.role_id)) }
      if(data.password && data.password.trim() !== '') payload.password = data.password
      console.log('saveEdit payload', id, payload)
      await updateUser(id, payload)
      setMessage(null)
      showToast({ title: 'Usuario actualizado', message: 'Cambios guardados', type: 'success', ttl: 5000 })
      setShowEditPassword(false)
      cancelEdit()
    }catch(err){
      console.error('saveEdit error', err)
      const text = (err && (err.error || err.message)) ? (err.error || err.message) : (typeof err === 'string' ? err : JSON.stringify(err))
      setMessage({ type: 'error', text: text || 'Error actualizando' })
    }
  }

  async function createNew(data){
    try{
      const payload = { nombre: data.nombre, email: data.email, password: data.password && data.password.trim() !== '' ? data.password : undefined, workspace_id: (data.workspace_id === '' ? null : Number(data.workspace_id)), role_id: (data.role_id === '' ? null : Number(data.role_id)) }
      await createUser(payload)
      const name = payload.nombre || payload.email || 'Usuario'
      showToast({ title: 'Usuario creado', message: `${name} agregado correctamente`, type: 'success', ttl: 5000 })
      setNewRow(false)
      resetNew()
      setShowNewPassword(false)
      setMessage(null)
    }catch(err){
      const text = err.error || err.message || 'Error creando usuario'
      showToast({ title: 'Error', message: text, type: 'error', ttl: 6000 })
      setMessage({ type: 'error', text })
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
          {/* Header rendered by Layout; avoid duplicate title here */}
          
                

            <div className="px-8 py-6 bg-surface-container-low/30 flex justify-between items-center">
            <StatCard title="Total Usuarios" value={String(users ? users.length : 0)} note="+12 este mes" />
          </div>
          <div className="mb-4 max-w-md">
            <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre, email, rol o workspace..." />
          </div>
          <div className="mb-6 w-full">
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
              <div className="text-[11px] font-bold text-slate-400 uppercase">Mostrando {filteredUsers.length} de {users ? users.length : 0} usuarios</div>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 360px)', overflow: 'auto' }} className="w-full rounded">
              <table className="w-full text-left border-collapse">
                <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
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
                  <>
                    <tr className="bg-surface-container-low">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">+</div>
                          <div>
                              <input {...registerNew('nombre')} placeholder="Nombre" className="px-3 py-2 border rounded w-48 min-w-0" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input {...registerNew('email')} placeholder="Email" className="px-3 py-2 border rounded w-64 min-w-0" />
                      </td>
                      <td className="px-6 py-4">
                        <select {...registerNew('role_id')} className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-container">
                          <option value="">Sin rol</option>
                          {ROLE_OPTIONS.map(r=> (<option key={r.id} value={r.id}>{r.label}</option>))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select {...registerNew('workspace_id')} className="px-3 py-2 border rounded">
                          <option value="">Sin workspace</option>
                          {workspaces && workspaces.map(w=> (<option key={w.id} value={w.id}>{w.nombre_cliente || w.id}</option>))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800">Pendiente</span>
                      </td>
                      <td className="px-6 py-4" />
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <div className="flex-1 min-w-[260px]">
                            <label className="block text-[11px] text-slate-500 mb-1">Contraseña opcional</label>
                            <div className="flex items-center gap-2">
                              <input placeholder="Contraseña opcional" type={showNewPassword ? 'text' : 'password'} {...registerNew('password')} className="px-3 py-2 border rounded w-full max-w-[320px] min-w-0" />
                              <button type="button" onClick={()=>setShowNewPassword(prev => !prev)} className="text-slate-600 text-sm whitespace-nowrap">{showNewPassword ? 'Ocultar' : 'Mostrar'}</button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button onClick={handleNewSubmit(createNew)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Guardar</button>
                            <button onClick={()=>{ setNewRow(false); resetNew(); setShowNewPassword(false) }} className="px-4 py-2 border rounded-lg">Descartar</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                )}
                {!loading && filteredUsers.map(u=> (
                  editingId === u.id ? (
                    <React.Fragment key={u.id}>
                      <tr className="hover:bg-surface-container-low">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">{(u.nombre||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                            <div>
                              <input {...registerEdit('nombre')} placeholder="Nombre" className="px-3 py-2 border rounded w-full max-w-[260px] min-w-0" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <input {...registerEdit('email')} placeholder="Email" className="px-3 py-2 border rounded w-full max-w-[320px] min-w-0" />
                        </td>
                        <td className="px-6 py-5">
                          <select {...registerEdit('role_id')} className="px-3 py-2 border rounded">
                            <option value="">Sin rol</option>
                            {ROLE_OPTIONS.map(r=> (<option key={r.id} value={r.id}>{r.label}</option>))}
                          </select>
                        </td>
                        <td className="px-6 py-5">
                          <select {...registerEdit('workspace_id')} className="px-3 py-2 border rounded">
                            <option value="">Sin workspace</option>
                            {workspaces && workspaces.map(w=> (<option key={w.id} value={w.id}>{w.nombre_cliente || w.id}</option>))}
                          </select>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${u.estado_invitacion === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'}`}>
                            {u.estado_invitacion === 'Pendiente' ? 'Pendiente' : 'Activo'}
                          </span>
                        </td>
                        <td className="px-6 py-5" />
                      </tr>
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex-1 min-w-[260px]">
                              <label className="block text-[11px] text-slate-500 mb-1">Nueva contraseña</label>
                              <div className="flex items-center gap-2">
                                <input placeholder="Contraseña opcional" type={showEditPassword ? 'text' : 'password'} {...registerEdit('password')} className="px-3 py-2 border rounded w-full max-w-[320px] min-w-0" />
                                <button type="button" onClick={()=>setShowEditPassword(prev => !prev)} className="text-slate-600 text-sm whitespace-nowrap">{showEditPassword ? 'Ocultar' : 'Mostrar'}</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                              <button onClick={handleEditSubmit(data=>saveEdit(u.id, data))} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Guardar</button>
                              <button onClick={cancelEdit} className="px-4 py-2 border rounded-lg">Cancelar</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ) : (
                    <tr key={u.id} className="hover:bg-surface-container-low">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">{(u.nombre||'').split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
                          <div>
                            <p className="text-sm font-bold text-blue-900">{u.nombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-container">{(ROLE_OPTIONS.find(ro=>ro.id === u.role_id) || { label: (typeof u.role_id === 'string' ? u.role_id : 'User') }).label}</span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium">{(workspaces && workspaces.find(w=>w.id === u.workspace_id) ? workspaces.find(w=>w.id === u.workspace_id).nombre_cliente : (u.workspace_id || '-'))}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${u.estado_invitacion === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {u.estado_invitacion === 'Pendiente' ? 'Pendiente' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right align-top">
                        <div className="flex justify-end gap-1">
                          <button onClick={()=>startEdit(u)} className="p-2">Editar</button>
                          <button onClick={()=>handleDeleteRequest(u.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
              </table>
            </div>
            <div className="px-8 py-6 bg-surface-container-low/30 flex justify-between items-center">
              <p className="text-xs font-medium text-slate-500">Página 1 de 15</p>
              <div className="flex gap-2"><button className="px-4 py-2 bg-white text-slate-400 rounded-lg">Anterior</button><button className="px-4 py-2 bg-white text-primary rounded-lg">Siguiente</button></div>
            </div>

            {/* bottom CTA removed to keep single create button at top */}
          </div>
        </div>
        <ConfirmDialog open={confirmOpen} title="Eliminar usuario" message="¿Confirmar eliminación del usuario? Esta acción no se puede deshacer." confirmText="Eliminar" cancelText="Cancelar" requireText="eliminar" onConfirm={handleDeleteConfirmed} onCancel={()=>{ setConfirmOpen(false); setConfirmPayload(null) }} />
      </Layout>
    </Protected>
  )
}
