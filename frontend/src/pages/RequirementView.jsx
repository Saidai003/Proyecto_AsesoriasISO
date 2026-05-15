import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'
import fetchWithAuth from '../lib/api'
import NavBarISO from '../components/NavBarISO'

function RequirementContent({ node }){
  const navigate = useNavigate()
  if(!node) return <div className="p-4">No encontrado</div>
  const children = node.children || []
  return (
    <div className="p-4">
      <div className="mt-2">
        {children && children.length>0 ? (
          <>
            <h3 className="text-lg font-semibold mb-1">Subrequisitos</h3>
            <div className="flex flex-wrap gap-1">
              {children.map(c=> (
                <button key={c.id} onClick={()=>navigate(`/requisitos/${c.id}`)} className="text-sm px-3 py-1 border rounded bg-white shadow-sm hover:bg-slate-50">
                  {c.descripcion_normativa}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">No hay subrequisitos asociados.</p>
        )}
        {/* File storage area (placeholders) above evaluation area */}
        <div className="mt-3 p-3 border rounded bg-white">
          <h5 className="text-sm font-medium mb-2">Archivos</h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { name: 'evidencia_01.pdf', id: 'f101' },
              { name: 'foto_entrada.jpg', id: 'f102' },
              { name: 'informe_v1.docx', id: 'f103' }
            ].map(file => {
              const isImage = /\.(jpe?g|png|gif|webp)$/i.test(file.name)
              // simple SVG thumbnail for placeholder images
              const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%234a5568'>${file.name}</text></svg>`
              const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
              return (
                <div key={file.id} className="aspect-square p-2 border rounded flex flex-col items-center justify-between">
                  <div className="w-full h-full flex flex-col items-center justify-between">
                    <div className="w-full h-0 flex-1 flex items-center justify-center overflow-hidden rounded bg-slate-50">
                      <div className="w-full h-full flex items-center justify-center">
                        {isImage ? (
                          <img src={dataUrl} alt={file.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-sm text-slate-600">{file.name.split('.').pop().toUpperCase()}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-center truncate w-full px-1">{file.name}</div>
                    <div className="mt-2 flex gap-2 justify-center">
                      <button onClick={()=>console.log('abrir', file)} className="text-xs px-2 py-1 border rounded bg-white">Abrir</button>
                      <button onClick={()=>console.log('historial', file)} className="text-xs px-2 py-1 border rounded bg-white">Historial</button>
                      <button onClick={()=>console.log('actualizar', file)} className="text-xs px-2 py-1 border rounded bg-[#00236f] text-white">Actualizar</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Evaluation area placeholder — leave space for evaluation UI below */}
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">Área de evaluación</h4>
          <p className="text-sm text-slate-500">Espacio para marcar evidencias, ver lista de NCs y estado del requisito.</p>
        </div>

        {/* NCs expanded list (placeholder data) */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">No conformidades</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="px-3 py-2 border-b">ID</th>
                  <th className="px-3 py-2 border-b">Estado flujo</th>
                  <th className="px-3 py-2 border-b">Validación</th>
                  <th className="px-3 py-2 border-b">Fecha verificación</th>
                  <th className="px-3 py-2 border-b">Comentario</th>
                  <th className="px-3 py-2 border-b">Última edición</th>
                  <th className="px-3 py-2 border-b">Abrir NC</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 101, estado_flujo: 'Abierta', estado_validacion: 'Parcial', evaluador_id: 5, evaluado_id: 8, fecha_verificacion_eficacia: '2026-05-20', comentario_nc: 'Falta evidencia de control.', fecha_ultima_edicion: '2026-05-10' },
                  { id: 102, estado_flujo: 'Ejecución', estado_validacion: 'Acepto', evaluador_id: 7, evaluado_id: 9, fecha_verificacion_eficacia: '2026-06-01', comentario_nc: 'No conformidad en procedimiento X.', fecha_ultima_edicion: '2026-05-12' }
                ].map(nc => (
                  <tr key={nc.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 border-b"><a onClick={()=>navigate(`/nc/${nc.id}`)} className="text-blue-600 hover:underline cursor-pointer">{nc.id}</a></td>
                    <td className="px-3 py-2 border-b">{nc.estado_flujo}</td>
                    <td className="px-3 py-2 border-b">{nc.estado_validacion}</td>
                    <td className="px-3 py-2 border-b">{nc.fecha_verificacion_eficacia}</td>
                    <td className="px-3 py-2 border-b">{nc.comentario_nc}</td>
                    <td className="px-3 py-2 border-b">{nc.fecha_ultima_edicion}</td>
                    <td className="px-3 py-2 border-b"><button onClick={()=>navigate(`/nc/${nc.id}`)} className="text-sm px-2 py-1 bg-[#00236f] text-white rounded">Abrir NC</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RequirementView(){
  const { id } = useParams()
  const { accessToken, user } = useAuth()
  const [node, setNode] = useState(null)
  const [loading, setLoading] = useState(true)


  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      try{
        // Prefer fetchWithAuth wrapper which adds auth headers and refresh logic
        // 1) find an ISO to request the full tree for (choose first ISO)
        const isosRes = await fetchWithAuth('/api/isos')
        if(!mounted) return
        if(!isosRes.ok){ setNode(null); return }
        const isos = await isosRes.json()
        const isoId = isos && isos.length ? isos[0].id : null
        if(!isoId){ setNode(null); return }

        // 2) fetch the full ISO tree (clauses + nested requisitos + requisitosMap)
        const treeRes = await fetchWithAuth(`/api/isos/${isoId}/tree`)
        if(!mounted) return
        if(!treeRes.ok){ setNode(null); return }
        const tree = await treeRes.json()

        // tree: { iso, clauses }
        // find the clause that contains the requisito by checking requisitosMap on each clause
        const { clauses } = tree || {}
        let found = null
        if(Array.isArray(clauses)){
          for(const clause of clauses){
            const map = clause.requisitosMap || {}
            // map keys are strings after JSON serialization; use id as string
            if(map[String(id)]){ found = { requisito: map[String(id)], clause }; break }
          }
        }
        setNode(found)
      }catch(e){ setNode(null) }
      finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=> mounted = false
  },[id, accessToken])


  if(loading) return <div className="p-4">Cargando...</div>

  // node is { requisito, clause }
  const requisito = node ? node.requisito : null
  const clause = node ? node.clause : null
  // prefer requisito.number + name; fallback to clause
  const titleText = requisito && requisito.number && requisito.name ? `${requisito.number} ${requisito.name}` : (clause ? `${clause.numero_clausula} ${clause.titulo}` : (requisito ? `Requisito ${requisito.id}` : 'Requisito'))

  
  

  return (
    <Layout title={titleText} sidebar={<NavBarISO/>}>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <RequirementContent node={requisito} />
        </div>
      </div>
    </Layout>
  )
}
