import React from 'react'
import Layout from '../../components/Layout'

function Sidebar(){
  return (
    <>
      <a className="flex items-center px-3 py-2 text-blue-900 font-bold border-l-4 border-blue-900 bg-slate-100" href="#">Panel Principal</a>
      <a className="flex items-center px-3 py-2 text-slate-600" href="#">Espacios de Trabajo</a>
      <a className="flex items-center px-3 py-2 text-slate-600" href="#">Usuarios</a>
    </>
  )
}

export default function LobbyAdmin(){
  return (
    <Layout title="Dashboard General" subtitle="Consolidado de auditorías y cumplimiento ISO 9001:2015" sidebar={<Sidebar/>}>
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
