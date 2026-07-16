import React, { useEffect, useMemo, useRef, useState } from 'react'
import fetchWithAuth from '../lib/api'
import { useAuth } from '../AuthContext'
import { showToast } from '../lib/ui'
import { useNavigate } from 'react-router-dom'

export default function Chat({ requisitoId, evaluacionId, evidences = [], ncList = [] }){
  const { accessToken, user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)
  const esRef = useRef(null)
  const [attachOpen, setAttachOpen] = useState(false)
  const [attachType, setAttachType] = useState('')
  const [attachItems, setAttachItems] = useState([])
  const [acciones, setAcciones] = useState([])
  const [attachQuery, setAttachQuery] = useState('')
  const [attachSelected, setAttachSelected] = useState([])
  const seenIds = useRef(new Set())
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if(!requisitoId) return
    let mounted = true
    ;(async () => {
      try{
        const r = await fetchWithAuth(`/api/chat?requisito_id=${requisitoId}`)
        if(!r.ok) return
        const json = await r.json()
        if(!mounted) return
        const parsed = (json || []).map(m => {
          try{
            if(m.metadata && typeof m.metadata === 'string') m.metadata = JSON.parse(m.metadata)
          }catch(_){ }
          if(m.id) seenIds.current.add(Number(m.id))
          return m
        })
        setMessages(parsed)
      }catch(e){ console.error('load chat', e) }
    })()
    return () => { mounted = false }
  }, [requisitoId])

  useEffect(() => {
    if(!accessToken || !requisitoId) return
    
    // Conectarse SOLO al canal de este requisito via WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(accessToken)}&requisito_id=${requisitoId}`
    const ws = new window.WebSocket(wsUrl)
    esRef.current = ws

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if(!parsed || parsed.event !== 'chat:new') return
        const nuevoMensaje = parsed.data
        if(!nuevoMensaje) return

        // Escudo anti-duplicados por seguridad
        if(nuevoMensaje.id && seenIds.current.has(Number(nuevoMensaje.id))) return
        if(nuevoMensaje.id) seenIds.current.add(Number(nuevoMensaje.id))

        // Si por alguna razón la metadata sigue siendo string, la parseamos; si no, viene limpia
        if(nuevoMensaje.metadata && typeof nuevoMensaje.metadata === 'string') {
          try {
            nuevoMensaje.metadata = JSON.parse(nuevoMensaje.metadata)
          } catch (_) {}
        }

        // Directo al estado ya que la segmentación se hace en el backend
        setMessages(prev => [...prev, nuevoMensaje])
      } catch (err) {
        console.error('parse chat ws event error', err)
      }
    }

    ws.onerror = (err) => { console.error('ws error', err) }
    return () => { try{ ws.close() }catch(_){ } }
  }, [accessToken, requisitoId])

  useEffect(() => {
    if(listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if(!evaluacionId) return
    ;(async () => {
      try{
        const r = await fetchWithAuth(`/api/acciones/evaluacion/${evaluacionId}`)
        if(!r.ok) return
        const json = await r.json()
        setAcciones(json || [])
      }catch(e){ console.error('load acciones', e) }
    })()
  }, [evaluacionId])

  const flashElement = (el, timeout = 3000) => {
    if(!el || !el.scrollIntoView) return false
    try{ el.scrollIntoView({ behavior: 'smooth', block: 'center' }) }catch(_){ el.scrollIntoView() }
    const isRow = String(el.tagName || '').toLowerCase() === 'tr'
    const highlightClasses = isRow
      ? ['bg-yellow-100']
      : ['outline', 'outline-2', 'outline-yellow-400', 'outline-offset-[-2px]', 'bg-yellow-50']
    el.classList.add(...highlightClasses)
    if(isRow){
      try{ Array.from(el.querySelectorAll('td, th')).forEach(cell => cell.classList.add('bg-yellow-100')) }catch(_){ }
    }
    setTimeout(() => {
      try{
        el.classList.remove(...highlightClasses)
        if(isRow){
          try{ Array.from(el.querySelectorAll('td, th')).forEach(cell => cell.classList.remove('bg-yellow-100')) }catch(_){ }
        }
      }catch(_){ }
    }, timeout)
    return true
  }

  const findAndFlash = (ids, timeout = 3000) => {
    for(const id of ids){
      const el = document.getElementById(id)
      if(el && flashElement(el, timeout)) return true
    }
    return false
  }

  const send = async () => {
    if(sending) return
    if(!text || !requisitoId) return
    setSending(true)
    const attachments = attachSelected.map(a => ({ type: a.type, id: a.id, title: a.title }))
    const payload = { requisito_id: requisitoId, contenido: text, metadata: { attachments } }
    try{
      const r = await fetchWithAuth('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if(!r.ok){
        const j = await r.json().catch(() => ({}))
        console.error('send failed', j)
        setSending(false)
        return
      }
      const msg = await r.json()
      try{
        if(msg.metadata && typeof msg.metadata === 'string') msg.metadata = JSON.parse(msg.metadata)
      }catch(_){ }
      if(msg.id && !seenIds.current.has(Number(msg.id))){
        seenIds.current.add(Number(msg.id))
        setMessages(prev => [...prev, msg])
      }
      setText('')
      setAttachType('')
      setAttachItems([])
      setAttachOpen(false)
      setAttachSelected([])
    }catch(e){ console.error('send chat error', e) }
    setSending(false)
  }

  const loadAttachItems = async (type) => {
    try{
      if(type === 'evidencia' && requisitoId){
        const r = await fetchWithAuth(`/api/evidencias/requisito/${requisitoId}`)
        if(!r.ok) return
        const j = await r.json()
        setAttachItems(j.evidencias || [])
        return
      }
      if((type === 'nc' || type === 'brecha') && evaluacionId){
        const r = await fetchWithAuth(`/api/nc/evaluacion/${evaluacionId}`)
        if(!r.ok) return
        const j = await r.json()
        setAttachItems(j || [])
        return
      }
      if(type === 'accion' && evaluacionId){
        const r = await fetchWithAuth(`/api/acciones/evaluacion/${evaluacionId}`)
        if(!r.ok) return
        const j = await r.json()
        setAttachItems(j || [])
        setAcciones(j || [])
        return
      }
    }catch(e){ console.error('load attach items', e) }
  }

  const onRefClick = (m) => {
    if(!m || !m.referencia_type || !m.referencia_id) return
    const typ = (m.referencia_type || '').toString().toLowerCase()
    const candidates = [
      `${typ}-${m.referencia_id}`
    ]
    if(typ.includes('evid')) candidates.push(`evidence-${m.referencia_id}`, `evidencia-${m.referencia_id}`)
    if(typ === 'nc' || typ === 'brecha' || typ.includes('no')) candidates.push(`nc-${m.referencia_id}`, `brecha-${m.referencia_id}`)
    if(typ.includes('accion')) candidates.push(`accion-${m.referencia_id}`, `acciones-${m.referencia_id}`)
    findAndFlash(candidates, 2500)
  }

  const onAttachmentClick = async (att) => {
    if(!att || !att.type || !att.id) return
    const typ = (att.type || '').toString().toLowerCase()
    const candidates = [
      `${typ}-${att.id}`
    ]
    if(typ.includes('evid')) candidates.push(`evidence-${att.id}`, `evidencia-${att.id}`)
    if(typ === 'nc' || typ === 'brecha' || typ.includes('no')) candidates.push(`nc-${att.id}`, `brecha-${att.id}`)
    if(typ.includes('accion')) candidates.push(`accion-${att.id}`, `acciones-${att.id}`)

    if(findAndFlash(candidates, 3000)) return

    try{
      if(typ.includes('accion')){
        const ac = acciones.find(x => Number(x.id) === Number(att.id))
        const ncId = ac && (
          ac.auditoria_nc_id ||
          ac.nc_id ||
          ac.no_conformidad_id ||
          ac.referencia_nc_id ||
          ac.no_conformidad
        )
        if(ncId){
          if(findAndFlash([`nc-${ncId}`], 3000)) return
          return navigate(`/nc/${ncId}`)
        }
        try{ showToast('No disponible', 'No se encontró la acción o su NC asociado en esta vista.', 'info', 4000) }catch(_){ }
        return
      }

      if(typ === 'nc' || typ === 'brecha' || typ === 'no conformidad' || typ === 'noconformidad') return navigate(`/nc/${att.id}`)
      if(typ.includes('evid')) return navigate(`/evidencias/${att.id}`)
    }catch(_){ }
  }

  const toggleSelectAttach = (item) => {
    const exists = attachSelected.find(x => x.type === attachType && Number(x.id) === Number(item.id))
    if(exists){
      setAttachSelected(prev => prev.filter(x => !(x.type === attachType && Number(x.id) === Number(item.id))))
      return
    }
    const defaultTitle = item.accion || item.propuesta || item.titulo || item.nombre_archivo || item.descripcion || item.nombre || `#${item.id}`
    setAttachSelected(prev => [...prev, { type: attachType, id: item.id, title: defaultTitle }])
  }

  const filteredAttachItems = useMemo(() => {
    const q = (attachQuery || '').toLowerCase().trim()
    if(!q) return attachItems
    return attachItems.filter(it => {
      const hay = `${it.nombre_archivo || ''} ${it.titulo || ''} ${it.descripcion || ''} ${it.propuesta || ''} ${it.accion || ''} ${it.nombre || ''} ${it.id || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [attachItems, attachQuery])

  const getAttachmentTitle = (a) => {
    if(!a) return ''
    if(a.type === 'accion'){
      const ac = acciones.find(x => Number(x.id) === Number(a.id))
      if(ac) return ac.accion || ac.propuesta || ac.nombre || a.title || `#${a.id}`
      return a.title || `#${a.id}`
    }
    if(a.type === 'evidencia'){
      const ev = evidences.find(x => Number(x.id) === Number(a.id))
      if(ev) return ev.nombre_archivo || a.title || `#${a.id}`
      return a.title || `#${a.id}`
    }
    if(a.type === 'nc' || a.type === 'brecha'){
      const nc = ncList.find(x => Number(x.id) === Number(a.id))
      if(nc) return nc.titulo || a.title || `Brecha #${a.id}`
      return a.title || `Brecha #${a.id}`
    }
    return a.title || `#${a.id}`
  }

  const getAttachmentBadge = (a) => {
    if(!a) return null
    if(a.type === 'accion'){
      const ac = acciones.find(x => Number(x.id) === Number(a.id))
      return ac ? (ac.estado || ac.estado_flujo || null) : null
    }
    if(a.type === 'evidencia'){
      const ev = evidences.find(x => Number(x.id) === Number(a.id))
      return ev ? (ev.estado_validacion_archivo || null) : null
    }
    if(a.type === 'nc' || a.type === 'brecha'){
      const nc = ncList.find(x => Number(x.id) === Number(a.id))
      return nc ? (nc.estado_validacion || nc.estado_flujo || null) : null
    }
    return null
  }

  return (
    <div className="mt-6 bg-white rounded-xl p-4 border shadow-sm">
      <h4 className="font-semibold mb-2">Chat</h4>
      <div ref={listRef} className="h-96 md:h-[28rem] overflow-auto p-2 border rounded bg-slate-50 space-y-2">
        {messages.map(m => (
          <div key={m.id || Math.random()} className="text-sm">
            <div className="text-xs text-slate-500">
              {(() => {
                if(!m.autor_id) return 'Sistema'
                const isMe = user && m.autor_id === user.id
                const name = isMe ? 'Yo' : (m.autor_nombre || (m.metadata && m.metadata.author && m.metadata.author.nombre) || `Usuario ${m.autor_id}`)
                const role = (m.autor_rol || (m.metadata && m.metadata.author && m.metadata.author.rol)) ? ` - ${m.autor_rol || (m.metadata && m.metadata.author && m.metadata.author.rol)}` : ''
                return `${name}${role}`
              })()} — <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <div className="bg-white p-2 rounded mt-1">
              <div className="whitespace-pre-wrap">{m.contenido}</div>
              {m.referencia_type && m.referencia_id && (
                <button onClick={()=>onRefClick(m)} className="mt-2 text-xs text-blue-600">Ir a {m.referencia_type === 'nc' ? 'brecha' : m.referencia_type} #{m.referencia_id}</button>
              )}
              {/* attachments listing */}
              {m.metadata && m.metadata.attachments && m.metadata.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {m.metadata.attachments.map((a, idx) => {
                    const key = `${a.type}-${a.id}`
                    const title = getAttachmentTitle(a)
                    const badge = getAttachmentBadge(a)
                    return (
                      <div key={key+idx} className="w-full p-1 bg-slate-100 rounded flex items-center">
                        <button onClick={()=>onAttachmentClick(a)} className="px-2 py-0.5 rounded text-xs bg-slate-200">Ver</button>
                        <div className="ml-2 flex-1 text-sm truncate">{title}</div>
                        {badge && <div className="text-[11px] px-2 py-0.5 rounded bg-slate-200">{badge}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="flex gap-2 items-center">
          <input onKeyDown={(e)=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send() } }} value={text} onChange={(e)=>setText(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 p-2 border rounded" />
          <button onClick={()=>{ setAttachOpen(o => !o); if(!attachOpen && attachType) loadAttachItems(attachType) }} className="px-2 py-1 border rounded text-sm">Adjuntar</button>
          <button onClick={send} disabled={sending} className={`px-3 py-1 ${sending ? 'bg-slate-400' : 'bg-blue-600'} text-white rounded`}>Enviar</button>
        </div>
        {attachOpen && (
          <div className="mt-2 p-2 border rounded bg-slate-50">
            <div className="flex gap-2 items-center mb-2">
              <select value={attachType} onChange={(e)=>{ setAttachType(e.target.value); setAttachItems([]); setAttachQuery(''); if(e.target.value) loadAttachItems(e.target.value) }} className="px-2 py-1 border rounded text-sm">
                <option value="">Tipo de referencia</option>
                <option value="evidencia">Evidencia</option>
                <option value="brecha">Brecha</option>
                <option value="accion">Acción correctiva</option>
              </select>
              <input value={attachQuery} onChange={(e)=>setAttachQuery(e.target.value)} placeholder="Buscar..." className="px-2 py-1 border rounded text-sm flex-1" />
              <div className="text-xs text-slate-500">Seleccionados: {attachSelected.length}</div>
            </div>
            <div className="max-h-56 overflow-auto border rounded p-2 bg-white">
              {filteredAttachItems.length === 0 ? (
                <div className="text-sm text-slate-500">No hay items.</div>
              ) : (
                <ul className="space-y-1">
                  {filteredAttachItems.map(it => {
                    const sel = attachSelected.find(x => x.type===attachType && Number(x.id)===Number(it.id))
                    const title = it.accion || it.propuesta || it.titulo || it.nombre_archivo || it.descripcion || it.nombre || `#${it.id}`
                    return (
                      <li key={it.id} className="flex items-center justify-between p-1 border rounded">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>toggleSelectAttach(it)} className={`px-2 py-0.5 rounded text-xs ${sel ? 'bg-green-600 text-white' : 'bg-slate-100'}`}>{sel ? 'Quitar' : 'Añadir'}</button>
                          <div className="text-sm truncate">{title}</div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {attachSelected.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {attachSelected.map(a => (
                  <div key={`${a.type}-${a.id}`} className="px-2 py-1 bg-slate-100 rounded text-xs">{a.title} <button onClick={()=>setAttachSelected(prev => prev.filter(x => !(x.type===a.type && Number(x.id)===Number(a.id))))} className="ml-1 text-red-600">x</button></div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
