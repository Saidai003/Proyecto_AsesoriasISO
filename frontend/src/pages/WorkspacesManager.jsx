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
  const [creating, setCreating] = React.useState(false)
  const [form, setForm] = React.useState({ nombre_cliente: ''})
  const [message, setMessage] = React.useState(null)
  const { workspaces, loadWorkspaces, createWorkspace } = useWorkspaces()

  React.useEffect(()=>{ loadWorkspaces() }, [loadWorkspaces])

  async function handleCreate(e){
    e.preventDefault()
    try{
      await createWorkspace(form)
      setMessage({ type: 'success', text: 'Espacio de trabajo creado'})
      setForm({ nombre_cliente: ''})
      setCreating(false)
    }
    catch(err){
      setMessage({ type: 'error', text: err.error || 'Error al crear espacio de trabajo' })
    }
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
              <div>
                <button onClick={()=>setCreating(c=>!c)} className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-xl font-bold">{creating ? 'Cancelar' : 'Nuevo Espacio'}</button>
              </div>
            {creating && (
              <form onSubmit={handleCreate} className="flex items-center gap-3 mt-4 w-full">
                <input
                  type="text"
                  placeholder="Nombre del cliente"
                  value={form.nombre_cliente}
                  onChange={(e) => setForm({ ...form, nombre_cliente: e.target.value })}
                  className="border border-slate-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                />
                <button type="submit" className="bg-primary text-white py-2 px-4 rounded-lg hover:bg-blue-600">
                  Crear
                </button>
              </form>
            )}
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
                      <th className="px-6 py-4 text-[10px] font-bold uppercase">Responsable SGC</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase">Fecha Creación</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr className="hover:bg-surface-container-high">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center font-black text-primary text-xs">NL</div><div><p className="font-bold text-sm">Nexus Logistics</p><p className="text-[10px] text-slate-400">ID: ESP-2024-001</p></div></div></td>
                      <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-600">Maximiliano Abascal</span></div></td>
                      <td className="px-6 py-4"><span className="text-sm text-slate-500">12/01/2024</span></td>
                      <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-1"><button className="p-2">Ver</button><button className="p-2">Editar</button><button className="p-2">Eliminar</button></div></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full"> <span className="material-symbols-outlined">add</span></button>

          </div>
          </Layout>
  
    </Protected>
  )
}
