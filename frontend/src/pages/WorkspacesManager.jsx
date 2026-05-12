import React from 'react'
import Protected from '../components/Protected'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import SearchInput from '../components/SearchInput'
import useWorkspaces from '../hooks/useWorkspaces'

function SideNav() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#f2f4f6] flex flex-col py-8 px-4 gap-y-6">
      <div className="px-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">W</div>
          <div>
            <h1 className="text-xl font-bold text-[#00236f]">GAP Análisis</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">ISO 9001:2015</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 flex flex-col gap-y-1">
        <a className="px-4 py-3 rounded-lg text-slate-600 hover:text-[#00236f]">Panel Principal</a>
        <a className="px-4 py-3 rounded-lg text-[#00236f] font-bold border-l-4 border-[#00236f] bg-white/50">Espacios de Trabajo</a>
        <a className="px-4 py-3 rounded-lg text-slate-600">Usuarios</a>
      </nav>
    </aside>
  )
}

export default function WorkspacesManager() {
  const [message, setMessage] = React.useState(null)
  const { workspaces, loading, loadWorkspaces, createWorkspace } = useWorkspaces()
  const { updateWorkspace, deleteWorkspace } = useWorkspaces()

  React.useEffect(()=>{ loadWorkspaces() }, [loadWorkspaces])

  const [newWorkspaceRow, setNewWorkspaceRow] = React.useState(false)
  const [newWorkspaceForm, setNewWorkspaceForm] = React.useState({ nombre_cliente: '' })
  const [editingId, setEditingId] = React.useState(null)
  const [editForm, setEditForm] = React.useState({ nombre_cliente: '' })

  function startEdit(w){
    setEditingId(w.id)
    setEditForm({ nombre_cliente: w.nombre_cliente || '' })
    setMessage(null)
  }

  function cancelEdit(){
    setEditingId(null)
    setEditForm({ nombre_cliente: '' })
  }

  async function saveEdit(id){
    try{
      await updateWorkspace(id, { nombre_cliente: editForm.nombre_cliente })
      setMessage({ type: 'success', text: 'Espacio actualizado' })
      cancelEdit()
    }catch(err){ setMessage({ type: 'error', text: err.error || err.message || 'Error actualizando' }) }
  }

  async function handleDelete(id){
    if(!confirm('Eliminar espacio de trabajo?')) return
    try{
      await deleteWorkspace(id)
      setMessage({ type: 'success', text: 'Espacio eliminado' })
    }catch(err){ setMessage({ type: 'error', text: err.error || err.message || 'Error eliminando' }) }
  }

  
  return (
    <Protected role="Admin">
        <Layout title="Gestor de Espacios de Trabajo" subtitle="Administración centralizada de clientes y cumplimiento ISO 9001:2015." sidebar={<SideNav/>}>
       <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
              <div>
                <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2 uppercase tracking-widest font-bold"><span>Admin</span><span className="material-symbols-outlined text-[10px]">chevron_right</span><span className="text-primary">ESPACIOS DE TRABAJO</span></nav>
                <h2 className="text-3xl font-black text-primary">Gestor de Espacios de Trabajo</h2>
                <p className="text-slate-500 mt-1 max-w-2xl">Administración centralizada de clientes y cumplimiento ISO 9001:2015.</p>
              </div>
              <div />
            
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Espacios" value="42" note="+3 este mes" />
            </div>
            <div className="mb-6">
              <SearchInput placeholder="Buscar clientes por nombre o ID (RF-ESP-3)..." />
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

                    {!loading && workspaces.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-6">No hay espacios de trabajo.</td>
                      </tr>
                    )}

                    {!loading && workspaces.map(w => (
                      <tr key={w.id} className="hover:bg-surface-container-low">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white">{(w.nombre_cliente || w.nombre || ' ')[0]}</div>
                            <div>
                              {editingId === w.id ? (
                                <input value={editForm.nombre_cliente} onChange={e=>setEditForm(f=>({...f,nombre_cliente:e.target.value}))} className="px-3 py-2 border rounded w-72" />
                              ) : (
                                <>
                                  <p className="font-bold">{w.nombre_cliente || w.nombre}</p>
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
                                <button onClick={()=>saveEdit(w.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg">Guardar</button>
                                <button onClick={cancelEdit} className="px-3 py-1.5 border rounded-lg">Cancelar</button>
                              </>
                            ) : (
                              <>
                                <button onClick={()=>startEdit(w)} className="px-3 py-1.5 border rounded-lg">Editar</button>
                                <button onClick={()=>handleDelete(w.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg">Eliminar</button>
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
                              <input value={newWorkspaceForm.nombre_cliente} onChange={e=>setNewWorkspaceForm(f=>({...f,nombre_cliente:e.target.value}))} placeholder="Nombre del cliente" className="px-3 py-2 border rounded w-72" />
                              <p className="text-sm text-slate-500">ID: --</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">--</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={async ()=>{ try{ await createWorkspace(newWorkspaceForm); setMessage({type:'success', text:'Espacio creado'}); setNewWorkspaceRow(false); setNewWorkspaceForm({ nombre_cliente: ''}); }catch(err){ setMessage({type:'error', text: err.error || err.message || 'Error'}) } }} className="px-4 py-2 bg-blue-600 text-white rounded-lg whitespace-nowrap">Enviar</button>
                            <button onClick={()=>{ setNewWorkspaceRow(false); setNewWorkspaceForm({ nombre_cliente: ''}); }} className="px-4 py-2 border rounded-lg whitespace-nowrap">Descartar</button>
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
          </Layout>

    </Protected>
  )
}
