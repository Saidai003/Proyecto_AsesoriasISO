import React, { useEffect, useState } from 'react'

function ToastItem({ t, onClose }){
  // `t` is a toast object with shape: { id, title, message, type, ttl }
  // `onClose` is a callback provided by the parent to remove this toast from state.
  // When the user clicks the ✕ button we call `onClose()` to remove the toast immediately.
  return (
    <div className={`max-w-sm w-full mb-2 p-3 rounded shadow-lg ${t.type==='error' ? 'bg-red-600 text-white' : 'bg-white text-slate-800'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{t.title}</div>
          {t.message && <div className="text-sm mt-1">{t.message}</div>}
        </div>
        <div>
          <button onClick={onClose} className="text-xs px-2 py-1">✕</button>
        </div>
      </div>
    </div>
  )
}

export default function Toast(){
  const [toasts, setToasts] = useState([])

  useEffect(()=>{
    // showHandler: called when a CustomEvent 'toast:show' is dispatched.
    // Parameter `e` is the browser Event object. For CustomEvent we pass data in `e.detail`.
    // `d` is a shortcut for `e.detail` (may be undefined), and contains the toast fields
    // sent by the emitter: { title, message, type, ttl }.
    // We create `t` (the toast) here adding a unique `id` and default values.
    const showHandler = (e) => {
      const d = e.detail || {} // payload sent with the CustomEvent
      const t = {
        id: Date.now() + Math.random(), // simple unique id
        title: d.title || 'Notificación',
        message: d.message || '',
        type: d.type || 'info',
        ttl: d.ttl || 5000 // time-to-live in ms; 0 or negative = persistent
      }
      // prepend new toast to the list
      setToasts(prev => [t, ...prev])
      // if ttl > 0 schedule automatic removal
      if(t.ttl > 0) setTimeout(()=> setToasts(prev => prev.filter(x => x.id !== t.id)), t.ttl)
    }

    // ncHandler: convenience listener for 'nc:created' events. It maps that event
    // into a standardized 'toast:show' CustomEvent. This keeps toast rendering
    // isolated here and other parts of the app only dispatch semantic events.
    const ncHandler = (e) => {
      const detail = e.detail || {}
      const title = 'No Conformidad creada'
      const message = detail.nc_id ? `NC #${detail.nc_id} creada` : 'Se creó una No Conformidad'
      // dispatch a 'toast:show' so showHandler will pick it up
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { title, message, type: 'info', ttl: 6000 } }))
    }

    // window.addEventListener attaches the handlers at the global/window level.
    // This pattern allows any code anywhere in the app to show a toast by doing:
    //   window.dispatchEvent(new CustomEvent('toast:show', { detail: { title, message } }))
    // The useEffect registers listeners once and returns a cleanup function that
    // removes them when the component unmounts.
    window.addEventListener('toast:show', showHandler)
    window.addEventListener('nc:created', ncHandler)
    return ()=>{
      window.removeEventListener('toast:show', showHandler)
      window.removeEventListener('nc:created', ncHandler)
    }
  },[])

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {toasts.map(t => <ToastItem key={t.id} t={t} onClose={()=> setToasts(prev => prev.filter(x => x.id !== t.id))} />)}
    </div>
  )
}
