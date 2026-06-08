import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import NavBarISO from '../../components/NavBarISO'
import { useAuth } from '../../AuthContext'

export default function LobbyOperative(){
  const { token, actingWorkspace } = useAuth()
  
  const [metrics, setMetrics] = useState({ nc_identificadas: 0, en_progreso: 0 })
  const [tablaOperativa, setTablaOperativa] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboards/operative', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setMetrics(data.metricas)
          setTablaOperativa(data.tabla_operativa)
        }
      } catch (error) {
        console.error("Error fetching operative dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [token])

  if (loading) {
    return <Layout title="Dashboard Operativo" sidebar={<NavBarISO/>}><div className="p-8">Cargando métricas...</div></Layout>
  }

  return (
    <Layout title="Dashboard Operativo" subtitle={`Espacio de trabajo activo: ${actingWorkspace || 'General'}`} sidebar={<NavBarISO/>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl">NC IDENTIFICADAS<br/><strong className="text-3xl">{metrics.nc_identificadas}</strong></div>
        <div className="bg-white p-6 rounded-xl">En Progreso<br/><strong className="text-3xl">{metrics.en_progreso}</strong></div>
      </div>

      <section className="bg-white rounded-xl overflow-hidden mt-6">
        <div className="p-6 border-b"><h3 className="text-lg font-bold">Estado Operativo de No Conformidades</h3></div>
        <div className="overflow-y-auto max-h-96">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low"><tr><th className="px-6 py-3">ID</th><th>Origen / Cláusula</th><th>Estado</th><th>Responsable</th><th>Progreso</th></tr></thead>
            <tbody>
              {tablaOperativa.map((fila, i) => (
                <tr key={i} className="odd:bg-surface-container-low">
                  <td className="px-6 py-4">{fila.id_visual}</td>
                  <td>{fila.origen}</td>
                  <td>{fila.estado}</td>
                  <td>{fila.responsable}</td>
                  <td>{fila.progreso}</td>
                </tr>
              ))}
              {tablaOperativa.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No hay registros operativos para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}