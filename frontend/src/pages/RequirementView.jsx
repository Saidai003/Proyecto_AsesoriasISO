import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'
import fetchWithAuth from '../lib/api'
import NavBarISO from '../components/NavBarISO'

function RequirementContent({ node }){
  if(!node) return <div className="p-4">No encontrado</div>
  return (
    <div className="p-4">
      <div className="mt-2">
        {node.children && node.children.length>0 ? (
          <>
            <h3 className="text-lg font-semibold mb-3">Subrequisitos</h3>
            <div className="space-y-3">
              {node.children.map(c=> (
                <div key={c.id} className="border rounded-xl p-4 bg-white shadow-sm">
                  <div className="font-semibold text-slate-800">{c.descripcion_normativa}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">No hay subrequisitos asociados.</p>
        )}
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

  // local UI state for requirement evaluation status
  const [reqState, setReqState] = useState(requisito && requisito.estado_cumplimiento ? requisito.estado_cumplimiento : '')

  const handleStateChange = async (e) => {
    const val = e.target.value
    setReqState(val)
    try{
      // attempt to persist state (backend endpoint may not exist yet)
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
      await fetchWithAuth(`${API_BASE}/api/isos/requisitos/${requisito.id}/state`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: val })
      })
    }catch(err){ console.error('failed setting requisito state', err) }
  }

  return (
    <Layout title={titleText} sidebar={<NavBarISO/>}>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <RequirementContent node={requisito} />
          <div className="mt-6 flex justify-end gap-3 items-center">
            {user && user.role === 'Responsable SGC' ? (
              <button className="px-4 py-2 bg-[#00236f] text-white rounded">Guardar cambios</button>
            ) : (
              <>
                <label className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Estado</span>
                  <select value={reqState} onChange={handleStateChange} className="px-3 py-2 border rounded">
                    <option value="">Cambiar estado</option>
                    <option value="Cumple">Cumple</option>
                    <option value="Parcial">Parcial</option>
                    <option value="No cumple">No cumple</option>
                    <option value="NA">NA</option>
                  </select>
                </label>
                <button className="px-4 py-2 bg-gray-200 rounded">Agregar comentario</button>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
