import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import useISO from '../hooks/useISO'
import { useNavigate } from 'react-router-dom'

function ClauseItem({ clause, requisitos, onToggle, requisitosWithNC }){
  const [open, setOpen] = useState(false)
  const handleClick = async () => {
    // If requisitos already loaded, just toggle
    if(requisitos){
      setOpen(o => !o)
      return
    }
    // otherwise, ask parent to load them and open when ready
    if(onToggle){
      try{
        await onToggle(clause.id)
        setOpen(true)
      }catch(e){
        // load failed, keep closed
        console.error('failed to load requisitos for clause', clause.id, e)
      }
    }
  }

  return (
    <div>
      <button onClick={handleClick} className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl ${open ? 'bg-white text-[#00236f] font-bold border-l-4 border-[#00236f]' : 'text-slate-500'}`}>
        <span>Cláusula {clause.numero_clausula}: {clause.titulo}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && requisitos && (
        <div className="pl-6 mt-2 space-y-1">
          {requisitos.filter(r=>!r.requisito_padre_id).map(r=> (
            <RequisitoItem key={r.id} requisito={r} all={requisitos} requisitosWithNC={requisitosWithNC} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequisitoItem({ requisito, all, requisitosWithNC }){
  const children = all.filter(a => a.requisito_padre_id === requisito.id)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={()=> navigate(`/requisitos/${requisito.id}`)} className="text-sm text-slate-700 text-left w-full text-left flex items-center gap-2" aria-expanded={open}>
          <span>{requisito.descripcion_normativa}</span>
          {/** red dot when NC assigned (in-memory event-based) */}
          {requisitosWithNC && requisitosWithNC.has(Number(requisito.id)) && (
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" title="No conformidad asignada" />
          )}
        </button>
        {children.length > 0 && <button onClick={()=>setOpen(!open)} className="text-xs text-slate-400">{open ? '▾' : '▸'}</button>}
      </div>
      {open && children.length>0 && (
        <div className="pl-4 mt-1 space-y-1">
          {children.map(c => <RequisitoItem key={c.id} requisito={c} all={all} />)}
        </div>
      )}
    </div>
  )
}

export default function NavBarISO(){
  const { isos, clausesByIso, requisitosByClausula, loadISOs, loadClauses, loadRequisitos } = useISO()
  const { user } = useAuth()
  const [selectedIso, setSelectedIso] = useState(null)
  const [requisitosWithNC, setRequisitosWithNC] = useState(new Set())

  useEffect(()=>{
    let mounted = true
    loadISOs().then(data=>{ if(mounted && data && data.length) setSelectedIso(data[0].id) }).catch(()=>{})
    return ()=>{ mounted = false }
  },[loadISOs])

  useEffect(()=>{
    if(selectedIso) loadClauses(selectedIso).catch(()=>{})
  },[selectedIso, loadClauses])

  useEffect(()=>{
    const handler = (e) => {
      try{
        const id = e.detail && e.detail.requisito_base_id
        if(!id) return
        setRequisitosWithNC(prev => {
          const s = new Set(prev)
          s.add(Number(id))
          return s
        })
      }catch(_){ }
    }
    window.addEventListener('nc:created', handler)
    return ()=> window.removeEventListener('nc:created', handler)
  },[])

  const handleClauseToggle = (clauseId) => {
    if(!requisitosByClausula[clauseId]) loadRequisitos(clauseId).catch(()=>{})
  }

  const clauses = selectedIso ? (clausesByIso[selectedIso] || []) : []

  return (
    <div className="flex flex-col">
      <div className="px-6 mb-4">
        <h2 className="text-sm font-bold">Normativas</h2>
        <p className="text-xs text-slate-500">ISO 9001:2015</p>
      </div>

      <div className="px-2 mb-2">
        <Link to={user && (user.role === 'Evaluador' || user.role === 'Responsable SGC') ? '/lobby' : '/dashboard'} className="block w-full text-left px-4 py-2 rounded-lg bg-[#00236f] text-white font-semibold">Dashboard</Link>
      </div>

      <div className="space-y-2 px-2 overflow-y-auto max-h-[70vh]">
        {clauses.map(c => (
          <ClauseItem key={c.id} clause={c} requisitos={requisitosByClausula[c.id]} onToggle={handleClauseToggle} requisitosWithNC={requisitosWithNC} />
        ))}
      </div>
    </div>
  )
}
