import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Layout from '../../components/Layout'
import NavBarISO from '../../components/NavBarISO'
import { useAuth } from '../../AuthContext'

function Sidebar(){
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

export default function LobbyAdmin(){
  const location = useLocation()
  const params = new URLSearchParams(location.search || '')
  const wsRaw = params.get('workspace')
  // Show NavBarISO only when an explicit, non-empty numeric workspace param is present
  const hasWorkspace = wsRaw && String(wsRaw).trim() !== '' && !Number.isNaN(Number(wsRaw))
  // debug: log search and decision
  try{ console.log('LobbyAdmin: location.search=', location.search, 'wsRaw=', wsRaw, 'hasWorkspace=', hasWorkspace) }catch(_){ }
  const sidebarContent = hasWorkspace ? <NavBarISO/> : <Sidebar/>

  return (
    <Layout title="Dashboard General" subtitle="Consolidado de auditorías y cumplimiento ISO 9001:2015" sidebar={sidebarContent}>
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-xl">
          <h3 className="text-4xl font-black text-primary">142</h3>
          <p className="text-xs text-on-secondary-container">TOTAL NO CONFORMIDADES IDENTIFICADAS</p>
        </div>
        <div className="bg-white p-6 rounded-xl">Empresas Activas: <strong>28</strong></div>
        <div className="bg-white p-6 rounded-xl">% Avance Global: <strong>64.2%</strong></div>
      </section>

      <div className="relative group max-w-2xl">
        <input className="pl-4 pr-6 py-4 bg-white border rounded-2xl text-sm w-full" placeholder="Buscar clientes, auditorías o espacios de trabajo..." />
      </div>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden border">
        <div className="px-8 py-6 flex items-center justify-between border-b">
          <h3 className="text-lg font-bold">Empresas en Proceso de Implementación</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low"><tr><th className="px-6 py-3">Empresa</th><th>Responsable</th><th>Estado</th><th>%</th></tr></thead>
            <tbody>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">Nova Logistics S.A.</td><td>Claudia Méndez</td><td>Fase de Auditoría</td><td>85%</td></tr>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">TechCorp Solutions</td><td>Ricardo Alva</td><td>Plan de Acción</td><td>42%</td></tr>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">Global Industrias</td><td>Elena Ruiz</td><td>Fase Documental</td><td>15%</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
