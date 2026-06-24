import React, { useState, useEffect } from 'react'
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
  const { actingWorkspace, accessToken: token } = useAuth()
  
  const hasWorkspace = (wsRaw && String(wsRaw).trim() !== '' && !Number.isNaN(Number(wsRaw))) || (actingWorkspace && String(actingWorkspace).trim() !== '' && !Number.isNaN(Number(actingWorkspace)))
  try{ console.log('LobbyAdmin: location.search=', location.search, 'wsRaw=', wsRaw, 'actingWorkspace=', actingWorkspace, 'hasWorkspace=', hasWorkspace) }catch(_){ }
  const sidebarContent = hasWorkspace ? <NavBarISO/> : <Sidebar/>

  // Estados para la data del backend
  const [metrics, setMetrics] = useState({ total_nc: 0, empresas_activas: 0, avance_global: '0%' })
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboards/admin', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setMetrics(data.metricas)
          setEmpresas(data.empresas)
        }
      } catch (error) {
        console.error("Error fetching admin dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [token])

  if (loading) {
    return <Layout title="Dashboard General" sidebar={sidebarContent}><div className="p-8">Cargando métricas...</div></Layout>
  }

  return (
    <Layout title="Dashboard General" subtitle="Consolidado de auditorías y cumplimiento ISO 9001:2015" sidebar={sidebarContent}>
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-xl">
          <h3 className="text-4xl font-black text-primary">{metrics.total_nc}</h3>
          <p className="text-xs text-on-secondary-container">TOTAL NO CONFORMIDADES IDENTIFICADAS</p>
        </div>
        <div className="bg-white p-6 rounded-xl">Empresas Activas:<br/><strong className="text-3xl">{metrics.empresas_activas}</strong></div>
        <div className="bg-white p-6 rounded-xl">% Avance Global:<br/><strong className="text-3xl">{metrics.avance_global}</strong></div>
      </section>

      <div className="relative group max-w-2xl mt-6">
        <input className="pl-4 pr-6 py-4 bg-white border rounded-2xl text-sm w-full" placeholder="Buscar clientes, auditorías o espacios de trabajo..." />
      </div>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden border mt-6">
        <div className="px-8 py-6 flex items-center justify-between border-b">
          <h3 className="text-lg font-bold">Empresas en Proceso de Implementación</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low"><tr><th className="px-6 py-3">Empresa</th><th>Responsable</th><th>Estado</th><th>%</th></tr></thead>
            <tbody>
              {empresas.map((emp, i) => (
                <tr key={i} className="odd:bg-surface-container-low">
                  <td className="px-6 py-4">{emp.empresa}</td>
                  <td>{emp.responsable}</td>
                  <td>{emp.estado}</td>
                  <td>{emp.avance}</td>
                </tr>
              ))}
              {empresas.length === 0 && (
                <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No hay empresas activas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}