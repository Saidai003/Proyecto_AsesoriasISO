import React from 'react'
import Protected from '../components/Protected'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import SearchInput from '../components/SearchInput'
import useWorkspaces from '../hooks/useWorkspaces'
import ConfirmDialog from '../components/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

function SideNav() {
  const baseClass = 'flex items-center px-3 py-2'
  const activeClass = baseClass + ' text-blue-900 font-bold border-l-4 border-blue-900 bg-slate-100'
  const inactiveClass = baseClass + ' text-slate-600'

  return (
    <>
      <NavLink to="/lobby" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Panel Principal</NavLink>
      <NavLink to="/workspaces" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Espacios de Trabajo</NavLink>
      <NavLink to="/users" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Usuarios</NavLink>
    </>
  )
}

export default function WorkspacesManager() {
  const navigate = useNavigate()
  const [message, setMessage] = React.useState(null)
  const { workspaces, loading, loadWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaces()
  const { setActingWorkspace } = useAuth()

  React.useEffect(()=>{ loadWorkspaces() }, [loadWorkspaces])

  const [q, setQ] = React.useState('')
  const filteredWorkspaces = React.useMemo(() => {
    if (!q) return workspaces || []
    const s = q.toLowerCase()
    return (workspaces || []).filter(w => {
      return (w.nombre_cliente || '').toLowerCase().includes(s) || String(w.id).includes(s)
    })
  }, [workspaces, q])

  const workspacesThisMonthCount = React.useMemo(() => {
    if (!workspaces || !workspaces.length) return 0
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    return workspaces.reduce((count, w) => {
      const created = w.fecha_creacion ? new Date(w.fecha_creacion) : null
      if (!created || Number.isNaN(created.getTime())) return count
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear ? count + 1 : count
    }, 0)
  }, [workspaces])

  const [newWorkspaceRow, setNewWorkspaceRow] = React.useState(false)
  const [editingId, setEditingId] = React.useState(null)

  const { register: registerNew, handleSubmit: handleNewSubmit, reset: resetNew } = useForm({ defaultValues: { nombre_cliente: '' } })
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm({ defaultValues: { nombre_cliente: '' } })

  function startEdit(w){
    setEditingId(w.id)
    resetEdit({ nombre_cliente: w.nombre_cliente || '' })
    setMessage(null)
  }

  function cancelEdit(){
    setEditingId(null)
    resetEdit({ nombre_cliente: '' })
  }

  async function saveEdit(id, data){
    try{
      await updateWorkspace(id, { nombre_cliente: data.nombre_cliente })
      setMessage({ type: 'success', text: 'Espacio actualizado' })
      cancelEdit()
    }catch(err){ setMessage({ type: 'error', text: err.error || err.message || 'Error actualizando' }) }
  }

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmPayload, setConfirmPayload] = React.useState(null)
  function handleDeleteRequest(id){ setConfirmPayload(id); setConfirmOpen(true) }
  async function handleDeleteConfirmed(){
    const id = confirmPayload
    setConfirmOpen(false)
    setConfirmPayload(null)
    try{
      await deleteWorkspace(id)
      setMessage({ type: 'success', text: 'Espacio eliminado' })
    }catch(err){ setMessage({ type: 'error', text: err.error || err.message || 'Error eliminando' }) }
  }

  
  return (
    <Protected role="Admin">
        <Layout title="Gestor de Espacios de Trabajo" subtitle="Administración centralizada de clientes y cumplimiento ISO 9001:2015." sidebar={<SideNav/>}>
       <div className="max-w-7xl mx-auto">
          {/* Header rendered by Layout; avoid duplicate title here */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Espacios" value={String(workspaces ? workspaces.length : 0)} note={`+${workspacesThisMonthCount} este mes`} />
            </div>
            <div className="mb-6">
              <SearchInput value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar clientes por nombre o ID (RF-ESP-3)..." />
            </div>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between bg-surface-container-low/50">
                <h3 className="font-bold text-primary uppercase text-sm">Directorio de Espacios de Trabajo</h3>
                <div className="flex items-center gap-2"><button className="p-2 hover:bg-surface-container rounded-lg"> <span className="material-symbols-outlined">filter_list</span></button></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase">Cliente / Logo</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase">Fecha Creación</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading && (
                      <tr>
                        <td colSpan={3} className="px-6 py-6">Cargando...</td>
                      </tr>
                    )}

                    {!loading && (workspaces || []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-6">No hay espacios de trabajo.</td>
                      </tr>
                    )}

                    {!loading && filteredWorkspaces.map(w => (
                      <tr key={w.id} className="hover:bg-surface-container-low">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">{(w.nombre_cliente || ' ')[0]}</div>
                            <div>
                              {editingId === w.id ? (
                                <input {...registerEdit('nombre_cliente')} className="px-3 py-2 border rounded w-72" />
                              ) : (
                                <>
                                  <p className="font-bold">{w.nombre_cliente}</p>
                                  <p className="text-sm text-slate-500">ID: {w.id}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{w.fecha_creacion ? new Date(w.fecha_creacion).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {editingId === w.id ? (
                                <>
                                <button onClick={handleEditSubmit(data=>saveEdit(w.id,data))} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg">Guardar</button>
                                <button onClick={cancelEdit} className="px-3 py-1.5 border rounded-lg">Cancelar</button>
                              </>
                            ) : (
                                <>
                                <button onClick={()=>startEdit(w)} className="px-3 py-1.5 border rounded-lg">Editar</button>
                                <button onClick={()=>{ try{ if(typeof setActingWorkspace === 'function') setActingWorkspace(w.id); else sessionStorage.setItem('actingWorkspace', String(w.id)) }catch(_){ } navigate('/lobby') }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg">Acceder</button>
                                <button onClick={()=>handleDeleteRequest(w.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg">Eliminar</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {newWorkspaceRow && (
                      <tr className="bg-surface-container-low">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">+</div>
                            <div>
                              <input {...registerNew('nombre_cliente')} placeholder="Nombre del cliente" className="px-3 py-2 border rounded w-72" />
                              <p className="text-sm text-slate-500">ID: --</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">--</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={handleNewSubmit(async (data)=>{ try{ await createWorkspace({ nombre_cliente: data.nombre_cliente }); setMessage({type:'success', text:'Espacio creado'}); setNewWorkspaceRow(false); resetNew(); }catch(err){ setMessage({type:'error', text: err.error || err.message || 'Error'}) } })} className="px-4 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap">Enviar</button>
                            <button onClick={()=>{ setNewWorkspaceRow(false); resetNew(); }} className="px-4 py-2 border rounded-lg whitespace-nowrap">Descartar</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom CTA: add a new workspace row under the table */}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setNewWorkspaceRow(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow">Agregar Espacio</button>
            </div>

            </div>
            <ConfirmDialog open={confirmOpen} title="Eliminar espacio" message="¿Confirmar eliminación del espacio de trabajo? Esta acción eliminará datos asociados." confirmText="Eliminar" cancelText="Cancelar" onConfirm={handleDeleteConfirmed} onCancel={()=>{ setConfirmOpen(false); setConfirmPayload(null) }} />
          </Layout>

    </Protected>
  )
}
