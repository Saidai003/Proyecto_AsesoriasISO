import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import NavBarISO from '../../components/NavBarISO'
import { useAuth } from '../../AuthContext'
import DashboardResponsible from '../DashboardResponsible'

export default function LobbyResponsible(){
  const { token } = useAuth()
  
  const [kpis, setKpis] = useState({ promedio_resolucion: '0 días', eficiencia_proceso: '0%', csat: '0 / 5.0' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboards/responsible', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setKpis(data.kpis_globales || { promedio_resolucion: '0 días', eficiencia_proceso: '0%', csat: '0 / 5.0' })
        }
      } catch (error) {
        console.error("Error fetching responsible dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [token])

  if (loading) {
    return <Layout title="Dashboard Responsable" sidebar={<NavBarISO/>}><div className="p-8">Cargando métricas...</div></Layout>
  }

  return (
    <Layout title="Dashboard Responsable" subtitle="Seguimiento de cumplimiento normativo y brechas." sidebar={<NavBarISO/>}>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl">Promedio de Resolución<br/><strong className="text-3xl">{kpis.promedio_resolucion}</strong></div>
        <div className="bg-white p-6 rounded-xl">Eficiencia de Proceso<br/><strong className="text-3xl">{kpis.eficiencia_proceso}</strong></div>
        <div className="bg-white p-6 rounded-xl">Satisfacción (CSAT)<br/><strong className="text-3xl">{kpis.csat}</strong></div>
      </section>

      {/* Gráficos de araña (radar) para responsable */}
      <section className="mt-6">
        <DashboardResponsible />
      </section>
    </Layout>
  )
}
