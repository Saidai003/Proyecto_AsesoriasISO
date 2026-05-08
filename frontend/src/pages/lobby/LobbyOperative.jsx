import React from 'react'
import Layout from '../../components/Layout'

function Sidebar(){
  return (
    <>
      <a className="flex items-center gap-3 py-3 px-6 text-[#00236f] font-bold bg-white border-l-4 border-[#00236f]" href="#">Volver al Dashboard</a>
      <a className="flex items-center gap-3 py-3 px-6 text-slate-600" href="#">4. Contexto</a>
      <a className="flex items-center gap-3 py-3 px-6 text-slate-600" href="#">5. Liderazgo</a>
    </>
  )
}

export default function LobbyOperative(){
  return (
    <Layout title="Dashboard Operativo" subtitle="Nova Logistics S.A. • Período Q3 2024" sidebar={<Sidebar/>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl">NC IDENTIFICADAS<br/><strong className="text-3xl">12</strong></div>
        <div className="bg-white p-6 rounded-xl">En Progreso<br/><strong className="text-3xl">08</strong></div>
      </div>

      <section className="bg-white rounded-xl overflow-hidden">
        <div className="p-6 border-b"><h3 className="text-lg font-bold">Estado Operativo de No Conformidades</h3></div>
        <div className="overflow-y-auto max-h-96">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low"><tr><th className="px-6 py-3">ID</th><th>Origen / Cláusula</th><th>Estado</th><th>Responsable</th><th>Progreso</th></tr></thead>
            <tbody>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">NC-2024-042</td><td>Auditoría Interna • Cláusula 8.5.1</td><td>Análisis de Causa</td><td>M. Arrieta</td><td>45%</td></tr>
              <tr className="odd:bg-surface-container-low"><td className="px-6 py-4">NC-2024-039</td><td>Reclamo Cliente • Cláusula 9.1.2</td><td>Acción Implementada</td><td>J. Corrales</td><td>80%</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  )
}
