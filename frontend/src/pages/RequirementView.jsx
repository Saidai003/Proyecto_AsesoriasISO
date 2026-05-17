import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import Layout from '../components/Layout'
import fetchWithAuth from '../lib/api'
import NavBarISO from '../components/NavBarISO'

function RequirementContent({ node }){
  const navigate = useNavigate()
  const { user } = useAuth()
  const [evidences, setEvidences] = useState([])
  const [ncList, setNcList] = useState([])
  const [evaluacionId, setEvaluacionId] = useState(null)
  useEffect(()=>{
    // mounted will be used for cancellation in case the 
    // component unmounts before the fetch completes

    // why would the componente unmount? what component?

    // The RequirementView component that uses RequirementContent
    // may unmount if the user navigates away before the fetch completes.
    let mounted = true
    async function loadEvidences(){
      try{
        const res = await fetchWithAuth(`/api/evidencias/requisito/${node.id}`)
        if(!mounted) return
        if(!res.ok) return
        const json = await res.json()
        setEvidences(json.evidencias || [])
      }catch(e){ console.error('load evidences', e) }
    }
    if(node && node.id) loadEvidences()
    return ()=> mounted = false
  },[node])

  // load evaluacion id and NCs for this requisito
  useEffect(()=>{
    let mounted = true
    async function loadNCs(){
      if(!node || !node.id) return
      try{
        const r = await fetchWithAuth(`/api/evaluaciones/requisito/${node.id}`)
        if(!r.ok) return
        const json = await r.json()
        const evId = json.id
        if(!mounted) return
        setEvaluacionId(evId)
        const ncr = await fetchWithAuth(`/api/nc/evaluacion/${evId}`)
        if(!ncr.ok) return
        const list = await ncr.json()
        if(!mounted) return
        setNcList(list || [])
      }catch(e){ console.error('load NCs', e) }
    }
    loadNCs()
    // refresh on global event when NC created
    const handler = (e) => {
      const detail = e.detail || {}
      if(detail.requisito_base_id == node.id){
        // re-run loadNCs
        loadNCs()
      }
    }
    window.addEventListener('nc:created', handler)
    return ()=>{ mounted = false; window.removeEventListener('nc:created', handler) }
  },[node])
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
            {evidences && evidences.length>0 ? evidences.map(ev => {
              const isImage = /\.(jpe?g|png|gif|webp)$/i.test(ev.nombre_archivo)
              const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='%23e2e8f0'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%234a5568'>${ev.nombre_archivo}</text></svg>`
              const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
              const status = ev.estado_validacion_archivo || 'Pendiente'
              const statusColor = status === 'Aceptado' ? 'bg-green-600 text-white' : (status === 'Rechazado' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white')
              return (
                <div key={ev.id} className="relative aspect-square p-2 border rounded flex flex-col items-center justify-between" >
                  <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded shadow-sm " style={{zIndex:20}}>
                    <span className={`${statusColor} px-2 py-1 rounded text-xs`}>{status}</span>
                  </div>
                  <div className="w-full h-full flex flex-col items-center justify-between">
                    <div className="w-full h-0 flex-1 flex items-center justify-center overflow-hidden rounded bg-slate-50">
                      <div className="w-full h-full flex items-center justify-center">
                        {isImage ? (
                          <img src={ev.url_archivo || dataUrl} alt={ev.nombre_archivo} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-sm text-slate-600">{ev.nombre_archivo.split('.').pop().toUpperCase()}</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-center truncate w-full px-1">{ev.nombre_archivo}</div>
                    <div className="mt-2 flex gap-2 justify-center">
                      <button onClick={()=>console.log('abrir', ev)} className="text-xs px-2 py-1 border rounded bg-white">Abrir</button>
                      <button onClick={()=>console.log('historial', ev)} className="text-xs px-2 py-1 border rounded bg-white">Historial</button>
                      <button onClick={()=>console.log('actualizar', ev)} className="text-xs px-2 py-1 border rounded bg-[#00236f] text-white">Actualizar</button>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="text-sm text-slate-500">No hay evidencias cargadas.</div>
            )}
          </div>
        </div>

        {/* Evaluation area / No Conformidades area */}
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">{user && user.role === 'Responsable SGC' ? 'No Conformidades' : 'Área de evaluación'}</h4>
          <p className="text-sm text-slate-500">{user && user.role === 'Responsable SGC' ? 'Espacio para gestionar NC y sus estados' : 'Espacio para marcar evidencias, ver lista de NCs y estado del requisito.'}</p>
          <div className="mt-3">
            {!(user && user.role === 'Responsable SGC') && (
              <button onClick={async ()=>{
                // lazy-load responsables and open modal via global event
                try{
                  const res = await fetchWithAuth('/api/users/responsables')
                  if(res.ok){
                    const list = await res.json()
                    window.dispatchEvent(new CustomEvent('nc:open', { detail: { responsables: list, requisito_base_id: node.id } }))
                  }else{
                    window.dispatchEvent(new CustomEvent('nc:open', { detail: { responsables: [], requisito_base_id: node.id } }))
                  }
                }catch(e){ window.dispatchEvent(new CustomEvent('nc:open', { detail: { responsables: [], requisito_base_id: node.id } })) }
              }} className="mt-2 px-3 py-2 bg-red-600 text-white rounded">Crear NC</button>
            )}
          </div>
        </div>

        {/* NCs expanded list (loaded from backend) */}
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
                {(ncList || []).map(nc => (
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
                {(!ncList || ncList.length===0) && (
                  <tr><td className="px-3 py-4 border-b text-sm text-slate-500" colSpan={7}>No hay No Conformidades registradas.</td></tr>
                )}
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


  // node is { requisito, clause }
  const requisito = node ? node.requisito : null
  const clause = node ? node.clause : null
  // prefer requisito.number + name; fallback to clause
  const titleText = requisito && requisito.number && requisito.name ? `${requisito.number} ${requisito.name}` : (clause ? `${clause.numero_clausula} ${clause.titulo}` : (requisito ? `Requisito ${requisito.id}` : 'Requisito'))

  // NC modal state and handlers (listens to global 'nc:open' event)
  const [ncModalOpen, setNcModalOpen] = useState(false)
  const [ncModalData, setNcModalData] = useState({ requisito_base_id: null, responsables: [], titulo: '', descripcion: '' })

  useEffect(()=>{
    const handler = (e) => {
      const detail = e.detail || {}
      const reps = (detail.responsables || []).map(r => ({ ...r, selected: false }))
      setNcModalData({ requisito_base_id: detail.requisito_base_id || (requisito && requisito.id), responsables: reps, titulo: '', descripcion: '' })
      setNcModalOpen(true)
    }
    window.addEventListener('nc:open', handler)
    return ()=> window.removeEventListener('nc:open', handler)
  },[requisito])

  async function submitNC(){
    try{
      const payload = {
        requisito_base_id: ncModalData.requisito_base_id,
        titulo: ncModalData.titulo,
        descripcion: ncModalData.descripcion,
        responsables: ncModalData.responsables.filter(r=>r.selected).map(r=>r.id)
      }
      const res = await fetchWithAuth('/api/nc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if(!res.ok){ const err = await res.json(); alert('Error creando NC: ' + (err.error || JSON.stringify(err))); return }
      const json = await res.json()
      // notify sidebar and show toast, then close modal
      window.dispatchEvent(new CustomEvent('nc:created', { detail: { requisito_base_id: ncModalData.requisito_base_id, nc_id: json.id } }))
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'NC creada', message: `NC #${json.id} creada y asignada.`, type: 'info', ttl: 6000 } }))
      setNcModalOpen(false)
    }catch(e){ console.error('submitNC error', e); alert('Error interno') }
  }

  if(loading) return <div className="p-4">Cargando...</div>

  return (
    <Layout title={titleText} sidebar={<NavBarISO/>}>
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <RequirementContent node={requisito} />
        </div>
      </div>
      {ncModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-[9999] pt-16">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[calc(100vh-4rem)] overflow-auto">
            <h3 className="text-lg font-semibold mb-2">Crear No Conformidad</h3>
            <div className="mb-2">
              <label className="text-sm">Título</label>
              <input className="w-full border px-2 py-1" value={ncModalData.titulo} onChange={e=>setNcModalData(d=>({ ...d, titulo: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="text-sm">Descripción</label>
              <textarea className="w-full border px-2 py-1" value={ncModalData.descripcion} onChange={e=>setNcModalData(d=>({ ...d, descripcion: e.target.value }))} />
            </div>
            <div className="mb-2">
              <label className="text-sm">Asignar a responsables</label>
              <div className="max-h-40 overflow-auto border p-2">
                {(ncModalData.responsables || []).map(r => (
                  <label key={r.id} className="flex items-center gap-2 mb-1"><input type="checkbox" checked={!!r.selected} onChange={e=>{
                    setNcModalData(d=>({ ...d, responsables: d.responsables.map(rr=> rr.id===r.id ? { ...rr, selected: e.target.checked } : rr) }))
                  }} /> {r.nombre} ({r.email})</label>
                ))}
                {(ncModalData.responsables||[]).length===0 && <div className="text-sm text-slate-500">No hay responsables disponibles.</div>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={()=>setNcModalOpen(false)} className="px-3 py-1 border rounded">Cancelar</button>
              <button onClick={submitNC} className="px-3 py-1 bg-[#00236f] text-white rounded">Crear NC</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
