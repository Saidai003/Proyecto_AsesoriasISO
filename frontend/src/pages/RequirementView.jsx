import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import NavBarISO from '../components/NavBarISO'
import fetchWithAuth from '../lib/api'
import RequirementContent from './RequirementContent'
import { useAuth } from '../AuthContext'
import { hasRole } from '../lib/userUtils'

export default function RequirementView(){
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [node, setNode] = useState(null)
  const [clause, setClause] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ncModalOpen, setNcModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  
  const [editForm, setEditForm] = useState({ descripcion_normativa: '' })
  const [ncForm, setNcForm] = useState({ titulo: '', descripcion: '' })
  const [responsables, setResponsables] = useState([])
  const [selectedResponsables, setSelectedResponsables] = useState([])
  const [responsableQuery, setResponsableQuery] = useState('')
  const [requirementStatus, setRequirementStatus] = useState({ label: 'No Aplica', className: 'bg-slate-100 text-slate-700' })
  const [filterText, setFilterText] = useState('')

  const isEvaluador = hasRole(user, 'evaluador')

  useEffect(()=>{
    let mounted = true
    const load = async ()=>{
      setLoading(true)
      setError('')
      try{
        const res = await fetchWithAuth(`/api/isos/requisitos/${id}`)
        if(!res.ok){
          const err = await res.json().catch(()=>({}))
          if(mounted) setError(err.error || 'No se pudo cargar el requisito')
          return
        }
        const json = await res.json()
        if(!mounted) return
        setNode(json.requisito || null)
        setClause(json.clause || null)
      }catch(e){
        console.error('load requisito error', e)
        if(mounted) setError('Error cargando requisito')
      }finally{
        if(mounted) setLoading(false)
      }
    }
    load()
    return ()=>{ mounted = false }
  },[id])

  useEffect(()=>{
    let mounted = true
    const loadResponsables = async ()=>{
      if(!ncModalOpen) return
      if(responsables && responsables.length) return
      try{
        const res = await fetchWithAuth('/api/users/responsables')
        if(!res.ok) return
        const list = await res.json()
        if(!mounted) return
        setResponsables(list || [])
      }catch(e){
        console.error('load responsables error', e)
      }
    }
    loadResponsables()
    return ()=>{ mounted = false }
  },[ncModalOpen, responsables])

  const title = useMemo(() => {
    if(!node) return 'Requisito'
    return node.number ? `Requisito ${node.number}` : `Requisito ${node.id}`
  },[node])

  const subtitle = useMemo(() => {
    if(!clause) return ''
    const n = clause.numero_clausula ? `Clausula ${clause.numero_clausula}` : 'Clausula'
    return `${n}: ${clause.titulo}`
  },[clause])

  const openNcModal = () => {
    setNcForm({ titulo: '', descripcion: '' })
    setSelectedResponsables([])
    setNcModalOpen(true)
  }

  const createNc = async ()=>{
    if(!node) return
    if(!ncForm.titulo.trim()){
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Brecha', message: 'El título es obligatorio', type: 'warning', ttl: 4000 } }))
      return
    }
    try{
      const payload = {
        requisito_base_id: node.id,
        titulo: ncForm.titulo.trim(),
        descripcion: ncForm.descripcion.trim(),
        responsables: selectedResponsables
      }
      const res = await fetchWithAuth('/api/nc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({}))
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: err.error || 'No se pudo crear NC', type: 'error', ttl: 6000 } }))
        return
      }
      const created = await res.json()
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Brecha creada', message: payload.titulo, type: 'success', ttl: 5000 } }))
      window.dispatchEvent(new CustomEvent('nc:created', { detail: { requisito_base_id: node.id, nc_id: created.id, responsables: selectedResponsables } }))
      setNcModalOpen(false)
    }catch(e){
      console.error('create NC error', e)
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error creando NC', type: 'error', ttl: 6000 } }))
    }
  }

  const openEditModal = () => {
    setEditForm({ descripcion_normativa: node?.descripcion_normativa || '' });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const res = await fetchWithAuth(`/api/isos/requisitos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if(res.ok) {
        const updated = await res.json();
        setNode(updated);
        setEditModalOpen(false);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Requisito actualizado', message: 'Los cambios se guardaron con éxito.', type: 'success', ttl: 4000 } }));
      }
    } catch(e) {
      console.error('Error updating requirement', e);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error actualizando requisito', type: 'error', ttl: 4000 } }));
    }
  };

  const confirmDelete = () => {
    setConfirmOpen(true);
  };

  const deleteRequirement = async () => {
    try {
      const res = await fetchWithAuth(`/api/isos/requisitos/${id}`, {
        method: 'DELETE'
      });
      if(res.ok) {
        navigate(-1);
        window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Requisito eliminado', message: 'El requisito fue eliminado.', type: 'success', ttl: 4000 } }));
      }
    } catch(e) {
      console.error('Error deleting requirement', e);
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title: 'Error', message: 'Error eliminando requisito', type: 'error', ttl: 4000 } }));
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <Layout title={title} subtitle={subtitle} sidebar={<NavBarISO/>}>
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Requisito</div>
              <h3 className="text-lg font-semibold text-slate-800">{node ? (node.descripcion_normativa || '—') : 'Cargando requisito...'}</h3>
              <div className="mt-2">
                <span className={`${requirementStatus.className} px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap`}>
                  Estado requisito: {requirementStatus.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEvaluador && (
                <button onClick={openNcModal} className="px-4 py-2 rounded bg-red-600 text-white text-sm">Registrar Brecha de Cumplimiento</button>
              )}
              {hasRole(user, 'admin') && (
                <>
                  <button onClick={openEditModal} className="px-4 py-2 rounded bg-blue-600 text-white text-sm">Editar</button>
                  <button onClick={confirmDelete} className="px-4 py-2 rounded bg-red-600 text-white text-sm">Eliminar</button>
                </>
              )}
            </div>
          </div>

          {loading && !node && (
            <div className="mt-4 text-sm text-slate-500">Cargando...</div>
          )}
          {error && (
            <div className="mt-4 text-sm text-red-600">{error}</div>
          )}
          {node && (
            <div className="mt-4">
              <RequirementContent node={node} onRequestCreateNc={isEvaluador ? openNcModal : null} onStatusChange={setRequirementStatus} />
            </div>
          )}
        </div>
      </div>

      {ncModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-6 overflow-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl p-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Registrar Brecha de Cumplimiento</h4>
              <button onClick={()=>setNcModalOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Titulo</label>
                <input value={ncForm.titulo} onChange={(e)=>setNcForm(prev => ({ ...prev, titulo: e.target.value }))} className="w-full px-3 py-2 border rounded" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Descripcion</label>
                <textarea value={ncForm.descripcion} onChange={(e)=>setNcForm(prev => ({ ...prev, descripcion: e.target.value }))} className="w-full px-3 py-2 border rounded" rows={4} />
              </div>
              <div>
                <label className="text-xs text-slate-500">Responsables (opcional)</label>
                <div className="mt-2">
                  <input
                    type="text"
                    value={responsableQuery}
                    onChange={(e)=>setResponsableQuery(e.target.value)}
                    placeholder="Buscar responsables por nombre o email"
                    className="w-full px-3 py-2 border rounded text-sm mb-2"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto border rounded p-2">
                    {(!responsables || responsables.length === 0) ? (
                      <div className="text-xs text-slate-500">No hay responsables disponibles.</div>
                    ) : (() => {
                      const q = (responsableQuery || '').toLowerCase().trim()
                      const filtered = q ? (responsables || []).filter(r => {
                        const hay = [r.nombre, r.email, r.nombre_usuario, r.nombre_completo].filter(Boolean).join(' ').toLowerCase()
                        return hay.includes(q)
                      }) : responsables
                      if(!filtered || filtered.length === 0) return (<div className="text-xs text-slate-500">No se encontraron responsables.</div>)
                      return filtered.map(r => {
                        const checked = selectedResponsables.includes(r.id)
                        return (
                          <label key={r.id} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={checked} onChange={()=>{
                              setSelectedResponsables(prev => checked ? prev.filter(id => id !== r.id) : [...prev, r.id])
                            }} />
                            <span>{r.nombre} ({r.email})</span>
                          </label>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={()=>setNcModalOpen(false)} className="px-3 py-2 border rounded">Cancelar</button>
              <button onClick={createNc} className="px-4 py-2 rounded bg-blue-600 text-white">Crear NC</button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Editar Requisito</h4>
              <button onClick={() => setEditModalOpen(false)} className="px-2 py-1 border rounded">Cerrar</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Descripción Normativa</label>
                <textarea 
                  value={editForm.descripcion_normativa}
                  onChange={(e) => setEditForm({ descripcion_normativa: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                />
              </div>
              <button onClick={handleEditSubmit} className="px-4 py-2 rounded bg-blue-600 text-white">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-md p-4">
            <div className="mb-4">
              <h4 className="font-semibold">Confirmar Eliminación</h4>
              <p className="mt-2">¿Estás seguro que deseas eliminar este requisito?</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 rounded border">
                Cancelar
              </button>
              <button onClick={deleteRequirement} className="px-4 py-2 rounded bg-red-600 text-white">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}