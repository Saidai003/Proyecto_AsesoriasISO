import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import NavBarISO from '../../components/NavBarISO'
import { useAuth } from '../../AuthContext'
import DashboardEvaluator from '../DashboardEvaluator'

export default function LobbyEvaluator(){
  const { accessToken: token } = useAuth()
  
  const [kpis, setKpis] = useState({ promedio_resolucion: '0 días', eficiencia_proceso: '0%', csat: '0 / 5.0' })
  const [porVerificar, setPorVerificar] = useState([])
  const [pendientesRevision, setPendientesRevision] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await fetch('/api/dashboards/evaluator', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setKpis(data.kpis)
          setPorVerificar(data.por_verificar)
          setPendientesRevision(data.pendientes_revision)
        }
      } catch (error) {
        console.error("Error fetching evaluator dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [token])

  if (loading) {
    return <Layout title="Dashboard Evaluador" sidebar={<NavBarISO/>}><div className="p-8">Cargando métricas...</div></Layout>
  }

  return (
    <Layout title="Dashboard Evaluador" subtitle="Análisis predictivo y seguimiento de cumplimiento normativo." sidebar={<NavBarISO/>}>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl">Promedio de Resolución<br/><strong className="text-3xl">{kpis.promedio_resolucion}</strong></div>
        <div className="bg-white p-6 rounded-xl">Eficiencia de Proceso<br/><strong className="text-3xl">{kpis.eficiencia_proceso}</strong></div>
        <div className="bg-white p-6 rounded-xl">Satisfacción (CSAT)<br/><strong className="text-3xl">{kpis.csat}</strong></div>
      </section>

      {/* Gráficos de araña (radar) para evaluador y responsable */}
      <section className="mt-6">
        <DashboardEvaluator />
      </section>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="p-6 flex items-center justify-between border-b">
          <div>
            <h3 className="text-lg font-bold">Requerimientos Por Verificar</h3>
            <p className="text-xs text-on-surface-variant">Lista de puntos de control pendientes de validación técnica.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container"><tr><th className="px-6 py-3">ID</th><th>Cláusula</th><th>Descripción</th><th>Estado</th></tr></thead>
            <tbody>
              {porVerificar.map((req, i) => (
                <tr key={i} className="odd:bg-surface-container-low">
                  <td className="px-6 py-4">{req.id_visual}</td>
                  <td>{req.clausula}</td>
                  <td className="truncate max-w-xs">{req.descripcion}</td>
                  <td>{req.estado}</td>
                </tr>
              ))}
              {porVerificar.length === 0 && (
                <tr><td colSpan="4" className="px-6 py-4 text-center text-gray-500">No hay requerimientos pendientes por verificar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="p-6 flex items-center justify-between border-b">
          <div>
            <h3 className="text-lg font-bold">Evidencias Pendientes de Revisión</h3>
            <p className="text-xs text-on-surface-variant">Archivos cargados esperando aprobación o rechazo.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container"><tr><th className="px-6 py-3">ID Evidencia</th><th>Nombre del Archivo</th><th>Fecha de Carga</th></tr></thead>
            <tbody>
              {pendientesRevision.map((ev, i) => (
                <tr key={i} className="odd:bg-surface-container-low">
                  <td className="px-6 py-4">{ev.id}</td>
                  <td>{ev.nombre_archivo}</td>
                  <td>{new Date(ev.fecha_carga).toLocaleDateString()}</td>
                </tr>
              ))}
              {pendientesRevision.length === 0 && (
                <tr><td colSpan="3" className="px-6 py-4 text-center text-gray-500">No hay evidencias pendientes de revisión.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}