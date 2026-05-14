import React from 'react'
import Layout from '../../components/Layout'
import NavBarISO from '../../components/NavBarISO'

export default function LobbyEvaluator(){
  return (
    <Layout title="Dashboard Evaluador" subtitle="Análisis predictivo y seguimiento de cumplimiento normativo." sidebar={<NavBarISO/>}>
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl">Promedio de Resolución<br/><strong className="text-3xl">4.2 días</strong></div>
        <div className="bg-white p-6 rounded-xl">Eficiencia de Proceso<br/><strong className="text-3xl">98.4%</strong></div>
        <div className="bg-white p-6 rounded-xl">Satisfacción (CSAT)<br/><strong className="text-3xl">4.9 / 5.0</strong></div>
      </section>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 flex items-center justify-between border-b">
          <div>
            <h3 className="text-lg font-bold">Requerimientos Por Verificar</h3>
            <p className="text-xs text-on-surface-variant">Lista filtrada de puntos de control pendientes de validación técnica.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container"><tr><th className="px-6 py-3">ID</th><th>Cláusula</th><th>Descripción</th><th>Responsable</th><th>Estado</th></tr></thead>
            <tbody>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">ISO-9001-4.1.2</td><td>Cláusula 4</td><td>Evaluación de riesgos y oportunidades...</td><td>Dir. Calidad</td><td>Pendiente</td></tr>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">ISO-9001-5.2.0</td><td>Cláusula 5</td><td>Comunicación efectiva de la Política...</td><td>Recursos Humanos</td><td>En Revisión</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
