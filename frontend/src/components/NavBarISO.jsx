import React, { useEffect, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import useISO from '../hooks/useISO'
import { hasRole } from '../lib/userUtils'
import fetchWithAuth from '../lib/api'

function ClauseItem({ clause, requisitos, onToggle, requisitosWithNC, notifCountsByReq }){
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
  // reduce requisitos to count of notifications for this clause 
  // (sum of counts for requisitos in this clause)
  const clauseNotifCount = (requisitos || []).reduce((acc, r) => {
    const id = r && r.id ? Number(r.id) : null
    // get number of notifications for this requisito
    const c = (notifCountsByReq && id && notifCountsByReq[id]) ? notifCountsByReq[id] : 0
    return acc + (c || 0)
  }, 0)

  return (
    <div>
      <button onClick={handleClick} className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl ${open ? 'bg-white text-[#00236f] font-bold border-l-4 border-[#00236f]' : 'text-slate-500'}`}>
        <span className="flex items-center gap-2">Cláusula {clause.numero_clausula}: {clause.titulo}
          {/* show numeric badge when there are notifications for requisitos in this clause */}
          {clauseNotifCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-red-600 text-white rounded-full w-6 h-6 text-xs">{clauseNotifCount}</span>
          )}
        </span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && requisitos && (
        <div className="pl-6 mt-2 space-y-1">
          {requisitos.filter(r=>!r.requisito_padre_id).map(r=> (
            <RequisitoItem key={r.id} requisito={r} all={requisitos} requisitosWithNC={requisitosWithNC} notifCountsByReq={notifCountsByReq} />
          ))}
        </div>
      )}
    </div>
  )
}

function RequisitoItem({ requisito, all, requisitosWithNC, notifCountsByReq }){
  const children = all.filter(a => a.requisito_padre_id === requisito.id)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={()=>{ navigate(`/requisitos/${requisito.id}`) }} className="text-sm text-slate-700 text-left w-full text-left flex items-center gap-2" aria-expanded={open}>
          <span>{requisito.descripcion_normativa}</span>
          {/** numeric badge when there are unread notifications for this requisito */}
          {notifCountsByReq && notifCountsByReq[Number(requisito.id)] > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-red-600 text-white rounded-full w-6 h-6 text-xs">{notifCountsByReq[Number(requisito.id)]}</span>
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
  const { user, actingWorkspace } = useAuth()
  const location = useLocation()
  // read workspace query param early so admins with ?workspace=... see clauses
  // workspaceParamEarly corresponds to the workspace query param that may be present on initial load 
  // (e.g. when an admin clicks "Acceder" from WorkspacesManager, which sets ?workspace= in the URL).
  // This allows the NavBarISO to render the clause tree immediately for admins when they have a workspace context,
  // regardless of whether the user context has fully loaded (even if the user context has not fully updated yet).
  // We treat this as an early hint for workspace context to ensure admins see clauses when they have a valid workspace selection, while still relying
  //  on the effective workspace logic that prefers URL params and actingWorkspace for determining the authoritative workspace context throughout the app.
  let workspaceParamEarly = null
  try{ const params = new URLSearchParams(location.search || ''); workspaceParamEarly = params.get('workspace') }catch(e){ workspaceParamEarly = null }
  const [selectedIso, setSelectedIso] = useState(null)
  const [requisitosWithNC, setRequisitosWithNC] = useState(new Set())
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifCountsByReq, setNotifCountsByReq] = useState({})
  const ncToReqRef = React.useRef({})

  // If admin is on top-level /lobby, do not render the clause tree here —
  // return a simple admin navigation instead. This is the authoritative
  // guard to prevent admins seeing clauses in the global lobby. Consider
  // actingWorkspace (set when pressing "Acceder") as a valid workspace
  // selection so admins who entered a workspace see the clause tree.
  if(location && location.pathname === '/lobby' && hasRole(user, 'admin') && !(workspaceParamEarly || actingWorkspace)){
    const baseClass = 'block w-full text-left px-4 py-2 rounded-lg'
    const activeClass = baseClass + ' bg-[#00236f] text-white font-semibold'
    const inactiveClass = baseClass + ' text-slate-700'
    return (
      <div className="flex flex-col px-2">
        <div className="px-6 mb-4">
          <h2 className="text-sm font-bold">Administración</h2>
          <p className="text-xs text-slate-500">Acciones globales</p>
        </div>
        <nav className="space-y-2">
          <NavLink to="/lobby" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Dashboard</NavLink>
          <NavLink to="/workspaces" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Espacios de Trabajo</NavLink>
          <NavLink to="/users" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Usuarios</NavLink>
        </nav>
      </div>
    )
  }

  // Compute an effective workspace: prefer URL param. As a safeguard, do NOT
  // treat `user.workspace_id` as an implicit workspace for Admin users — that
  // causes admins to see clauses while on the global /lobby. Only fall back to
  // `user.workspace_id` for non-admin roles.
  let workspaceParam = null
  try{ const params = new URLSearchParams(location.search || ''); workspaceParam = params.get('workspace') }catch(e){ workspaceParam = null }

  // if an early workspace param was detected (e.g. LobbyAdmin passed it), prefer it
  if(!workspaceParam && typeof workspaceParamEarly !== 'undefined' && workspaceParamEarly) workspaceParam = workspaceParamEarly

  // Fallback: if no workspace param in URL, check AuthContext.actingWorkspace (persisted to sessionStorage)
  if(!workspaceParam){
    try{ if(actingWorkspace) workspaceParam = actingWorkspace }catch(_){ }
  }

  const userWorkspace = (user && user.workspace_id && !hasRole(user, 'admin')) ? String(user.workspace_id) : null
  const effectiveWorkspace = workspaceParam || userWorkspace
  try{ console.log('NavBarISO: pathname=', location.pathname, 'search=', location.search, 'effectiveWorkspace=', effectiveWorkspace, 'userRole=', user && user.role) }catch(_){ }

  // Load ISOs when we have an effective workspace and no ISOs loaded yet.
  useEffect(()=>{
    let mounted = true
    if(!effectiveWorkspace) return () => { mounted = false }
    if(isos && isos.length){
      // already have data; ensure selectedIso is set
      if(mounted && (!selectedIso) && isos.length) setSelectedIso(isos[0].id)
      return () => { mounted = false }
    }
    loadISOs().then(data=>{ if(mounted && data && data.length) setSelectedIso(data[0].id) }).catch(()=>{})
    return ()=>{ mounted = false }
  // include effectiveWorkspace so that when user context changes, we attempt load if needed
  },[loadISOs, effectiveWorkspace])

  useEffect(()=>{
    if(!selectedIso) return
    const hasClauses = clausesByIso && clausesByIso[selectedIso] && clausesByIso[selectedIso].length
    if(!hasClauses) loadClauses(selectedIso).catch(()=>{})
  },[selectedIso, loadClauses, clausesByIso])

  // Poll notifications periodically
  useEffect(()=>{
    let mounted = true
    const STORAGE_KEY = 'shownNotifications'
    // load shown notification ids from sessionStorage so toasts are not re-shown on navigation
    let shownIds = new Set()
    try{
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if(raw) JSON.parse(raw).forEach(id=>shownIds.add(id))
    }catch(_){ shownIds = new Set() }
    const fetchNotifs = async ()=>{
      try{
        const r = await fetchWithAuth('/api/notifications')
        if(!r.ok) return
        const list = await r.json()
        if(!mounted) return
        setNotifications(list)
        const unread = list.filter(n=>!n.read_flag).length
        setUnreadCount(unread)
        // build map of requisito_id -> count for unread notifications
        const counts = {}
        // helper to increment
        const inc = (reqId) => { if(!reqId) return; counts[reqId] = (counts[reqId]||0) + 1 }
        // for notifications that reference NCs, resolve NC -> requisito_base_id (cached)
        for(const n of list){
          if(n.read_flag) continue
          const link = n.link || ''
          if(link.startsWith('/nc/')){
            const parts = link.split('/')
            const ncId = parts[parts.length-1]
            if(!ncId) continue
            const cached = ncToReqRef.current[ncId]
            if(cached){ inc(cached); continue }
            try{
              const rr = await fetchWithAuth(`/api/nc/${ncId}`)
              if(!rr.ok) continue
              const ncObj = await rr.json()
              const reqId = ncObj.requisito_base_id || ncObj.requisito_requisito_id || null
              if(reqId) ncToReqRef.current[ncId] = Number(reqId)
              inc(reqId)
            }catch(e){ console.error('resolve nc to requisito error', e) }
          }
        }
        if(mounted) setNotifCountsByReq(counts)
        // persist seen ids so the dropdown becomes the primary notification surface
        const newOnes = list.filter(n => !shownIds.has(n.id))
        for(const n of newOnes){
          try{ shownIds.add(n.id) }catch(_){ }
        }
        try{ sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(shownIds))) }catch(_){ }
      }catch(e){ console.error('notifications poll error', e) }
    }
    fetchNotifs()
    const t = setInterval(fetchNotifs, 15000)
    return ()=>{ mounted = false; clearInterval(t) }
  },[])

  useEffect(()=>{
    const handler = (e) => {
      try{ const rid = e.detail && e.detail.requisitoId; if(!rid) return; setNotifCountsByReq(prev=>{ const copy = { ...prev }; delete copy[rid]; return copy }) }catch(_){ }
    }
    window.addEventListener('notifications:cleared', handler)
    return ()=> window.removeEventListener('notifications:cleared', handler)
  },[])

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
    // when a new NC is created, also update notif counts immediately
    const newNotifHandler = (e) => {
      try{
        const d = e.detail || {}
        const ncId = d.nc_id
        const reqId = d.requisito_base_id ? Number(d.requisito_base_id) : null
        const responsables = Array.isArray(d.responsables) ? d.responsables : []
        if(ncId && reqId){
          // cache mapping
          ncToReqRef.current[String(ncId)] = reqId
          setNotifCountsByReq(prev => ({ ...(prev||{}), [reqId]: ((prev && prev[reqId])||0) + responsables.length }))
          setUnreadCount(c => c + responsables.length)
        }
      }catch(_){ }
    }
    window.addEventListener('notifications:new', newNotifHandler)
    return ()=>{ window.removeEventListener('nc:created', handler); window.removeEventListener('notifications:new', newNotifHandler) }
  },[])

  const handleClauseToggle = (clauseId) => {
    if(!requisitosByClausula[clauseId]) loadRequisitos(clauseId).catch(()=>{})
  }

  const clauses = selectedIso ? (clausesByIso[selectedIso] || []) : []

  // If no effective workspace selected, show admin-style links so admins can navigate
  // Also ensure admins on the top-level /lobby never see clause tree unless a ?workspace is present
  if(!effectiveWorkspace || (location.pathname === '/lobby' && hasRole(user, 'admin') && !workspaceParam)){
    const baseClass = 'block w-full text-left px-4 py-2 rounded-lg'
    const activeClass = baseClass + ' bg-[#00236f] text-white font-semibold'
    const inactiveClass = baseClass + ' text-slate-700'

    return (
      <div className="flex flex-col px-2">
        <div className="px-6 mb-4">
          <h2 className="text-sm font-bold">Administración</h2>
          <p className="text-xs text-slate-500">Acciones globales</p>
        </div>
        <nav className="space-y-2">
          <NavLink to="/lobby" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Dashboard</NavLink>
          {hasRole(user, 'admin') && <NavLink to="/workspaces" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Espacios de Trabajo</NavLink>}
          {hasRole(user, 'admin') && <NavLink to="/users" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Usuarios</NavLink>}
        </nav>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="px-6 mb-4">
        <h2 className="text-sm font-bold">Normativas</h2>
        <p className="text-xs text-slate-500">ISO 9001:2015</p>
      </div>

      <div className="px-2 mb-2">
        <Link to={user && (hasRole(user, 'evaluador') || hasRole(user, 'responsable')) ? '/lobby' : '/dashboard'} className="block w-full text-left px-4 py-2 rounded-lg bg-[#00236f] text-white font-semibold flex items-center justify-between">
          <span>Dashboard</span>
        </Link>
      </div>

      <div className="space-y-2 px-2 overflow-y-auto max-h-[70vh]">
        {clauses.map(c => (
          <ClauseItem key={c.id} clause={c} requisitos={requisitosByClausula[c.id]} onToggle={handleClauseToggle} requisitosWithNC={requisitosWithNC} notifCountsByReq={notifCountsByReq} />
        ))}
      </div>
    </div>
  )
}
