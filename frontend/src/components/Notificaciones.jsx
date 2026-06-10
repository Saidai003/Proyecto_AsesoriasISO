import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import fetchWithAuth from '../lib/api'
import { useAuth } from '../AuthContext'
import { hasRole } from '../lib/userUtils'

const canSeeNotifications = (user) => hasRole(user, 'admin') || hasRole(user, 'evaluador') || hasRole(user, 'responsable')

const formatDate = (value) => {
  if(!value) return ''
  try{
    return new Date(value).toLocaleString()
  }catch(_){
    return ''
  }
}

export default function Notificaciones(){
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowed = canSeeNotifications(user)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const rootRef = useRef(null)


  const unreadItems = useMemo(() => items.filter(n => !n.read_flag), [items])

  const loadNotifications = useCallback(async () => {
    if(!allowed) return
    setLoading(true)
    try{
      const res = await fetchWithAuth('/api/notifications')
      if(!res.ok) return
      const list = await res.json()
      setItems(Array.isArray(list) ? list : [])
    }catch(e){
      console.error('load notifications error', e)
    }finally{
      setLoading(false)
    }
  }, [allowed])

  const clearNotifications = useCallback(async () => {
    if(!unreadItems.length) return
    setSaving(true)
    try{
      await Promise.all(unreadItems.map(n => fetchWithAuth(`/api/notifications/${n.id}/read`, { method: 'PATCH' })))
      setItems(prev => prev.map(n => ({ ...n, read_flag: 1 })))
      setOpen(false)
    }catch(e){
      console.error('clear notifications error', e)
    }finally{
      setSaving(false)
    }
  }, [unreadItems])

  useEffect(() => {
    if(!allowed) return
    loadNotifications()
    const timer = setInterval(loadNotifications, 15000)
    return () => clearInterval(timer)
  }, [allowed, loadNotifications])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if(rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const handleRefresh = () => {
      loadNotifications()
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('notifications:new', handleRefresh)
    window.addEventListener('notifications:cleared', handleRefresh)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('notifications:new', handleRefresh)
      window.removeEventListener('notifications:cleared', handleRefresh)
    }
  }, [loadNotifications])

  if(!allowed) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        aria-expanded={open}
        aria-label="Notificaciones"
      >
        <span className="text-base">🔔</span>
        <span>Notificaciones</span>
        {unreadItems.length > 0 && (
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
            {unreadItems.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Notificaciones</div>
              <div className="text-xs text-slate-500">Solo visibles para Admin, Evaluador y Responsable</div>
            </div>
            <button
              onClick={clearNotifications}
              disabled={saving || unreadItems.length === 0}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Borrar Notificaciones
            </button>
          </div>

          <div className="max-h-[28rem] overflow-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-slate-500">Cargando...</div>
            ) : unreadItems.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">No hay notificaciones pendientes.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {unreadItems.map(n => (
                  <div key={n.id} className="px-4 py-3 cursor-pointer" onClick={() => { if (n.link) navigate(n.link); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{n.tipo || 'Notificación'}</div>
                      <div className="mt-1 break-words text-sm text-slate-800">{n.mensaje}</div>
                      {n.link && (
                        <div className="mt-1 break-all text-[11px] text-slate-400 underline">{n.link}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">{formatDate(n.created_at)}</div>
                </div>))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
