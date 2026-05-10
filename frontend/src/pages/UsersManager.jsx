import React from 'react'
import Protected from '../components/Protected'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import SearchInput from '../components/SearchInput'

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
  const [form, setForm] = React.useState({ nombre: '', email: '', password: '' })
  const [message, setMessage] = React.useState(null)

  async function handleCreate(e){
    e.preventDefault()
    setMessage(null)
    try{
        // Client -> Server: POST new user using Fetch API.
        // See MDN Fetch docs and SOURCES.md -> frontend/src/pages/UsersManager.jsx for references.
        const res = await fetch('http://localhost:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if(res.ok){
        const data = await res.json()
        setMessage({ type: 'success', text: `Usuario creado (id: ${data.id})` })
        setForm({ nombre: '', email: '', password: '' })
        setCreating(false)
      } else {
        const err = await res.json().catch(()=>({error: 'unknown'}))
        setMessage({ type: 'error', text: err.error || 'Error creando usuario' })
      }
    }catch(err){
      setMessage({ type: 'error', text: err.message })
    }
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
              <button onClick={()=>setCreating(c=>!c)} className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-xl font-bold">{creating ? 'Cancelar' : 'Nuevo Usuario'}</button>
            </div>
          </div>
          {creating && (
            <form onSubmit={handleCreate} className="mb-6 bg-white p-4 rounded shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre" className="px-3 py-2 border rounded" />
                <input required value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email" className="px-3 py-2 border rounded" />
                <input required value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Password" type="password" className="px-3 py-2 border rounded" />
              </div>
              <div className="mt-3 flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Crear</button>
                <button type="button" onClick={()=>{setCreating(false); setForm({nombre:'',email:'',password:''})}} className="px-4 py-2 border rounded">Cancelar</button>
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
                <tr className="hover:bg-surface-container-low">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">JD</div>
                      <div>
                        <p className="text-sm font-bold text-blue-900">Julián Domínguez</p>
                        <p className="text-xs text-slate-500">j.dominguez@globalcorp.com</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5"><span className="px-3 py-1 rounded-full text-[10px] font-black bg-primary-container">Admin</span></td>
                  <td className="px-6 py-5"><p className="text-sm font-medium">Tenancy Global</p></td>
                  <td className="px-6 py-5"><span className="text-xs font-bold text-blue-900">Activo</span></td>
                  <td className="px-6 py-5 text-right"><div className="flex justify-end gap-1"><button className="p-2">Editar</button><button className="px-3 py-1.5 bg-tertiary-container rounded-lg">Re-enviar</button></div></td>
                </tr>
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
