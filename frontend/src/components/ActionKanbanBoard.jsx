import React, { useState, useMemo, useRef } from 'react'
import fetchWithAuth from '../lib/api'
import { showToast } from '../lib/toast'
import getErrorText from '../lib/errorMessage'
import { hasRole } from '../lib/userUtils'
import { statusColor } from '../lib/ncHelpers'
import EditableEstado from './EditableEstado'
import ConfirmDialog from './ConfirmDialog'

const KANBAN_STATES = ['Pendiente', 'En_Progreso', 'Eficaz', 'No_Eficaz']

const formatKanbanState = (state) => {
  if (state === 'En_Progreso') return 'En progreso'
  if (state === 'No_Eficaz') return 'No eficaz'
  return state || 'Sin estado'
}

export default function ActionKanbanBoard({
  threads,
  setThreads,
  ncId,
  user,
  onRequestDelete
}) {
  const [draggingActionId, setDraggingActionId] = useState(null)
  const [dropState, setDropState] = useState('')
  const [savingActionId, setSavingActionId] = useState(null)
  const [viewMode, setViewMode] = useState('all')
  
  // ✅ Ref para evitar flickering en dragleave
  const dragCounterRef = useRef(0)

  const actionsByState = useMemo(() => {
    return KANBAN_STATES.reduce((acc, state) => {
      acc[state] = (threads || [])
        .filter(t => (t.estado_accion || 'Pendiente') === state)
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
      return acc
    }, {})
  }, [threads])

  const updateActionState = async (actionId, nextState) => {
    const current = threads.find(t => Number(t.id) === Number(actionId))
    if (!current || (current.estado_accion || 'Pendiente') === nextState) return
    
    setSavingActionId(actionId)
    try {
      const res = await fetchWithAuth(`/api/acciones/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_accion: nextState })
      })
      if (res.ok) {
        const updated = await res.json()
        setThreads(prev => prev.map(t => Number(t.id) === Number(updated.id) ? updated : t))
        showToast({ title: 'Estado actualizado', message: `La acción pasó a ${formatKanbanState(nextState)}`, type: 'success' })
      } else {
        const err = await res.json().catch(() => null)
        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo cambiar el estado'), type: 'error' })
      }
    } catch (e) {
      console.error('update action state error', e)
      showToast({ title: 'Error', message: 'No se pudo cambiar el estado', type: 'error' })
    } finally {
      setSavingActionId(null)
    }
  }

  const ActionCard = ({ action, onRequestDelete }) => {
    const [openForm, setOpenForm] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)
    const [showChildren, setShowChildren] = useState(false)
    const [form, setForm] = useState({
      accion: '',
      contenido_comentario: '',
      estado_accion: 'Pendiente',
      acciones_futuras_propuestas: '',
      requiere_nueva_nc: false
    })
    
    const children = threads.filter(t => Number(t.accion_previa_id) === Number(action.id))
    const isDragging = Number(draggingActionId) === Number(action.id)
    const canDrag = hasRole(user, 'responsable') || hasRole(user, 'admin')
    const isSavingThis = Number(savingActionId) === Number(action.id)

    // ✅ Mejorado: usar useRef para evitar race conditions en drag
    const dragStartTimeRef = useRef(null)

    return (
      <div
        draggable={canDrag}
        onDragStart={(e) => {
          if (!canDrag) {
            e.preventDefault()
            return
          }
          dragStartTimeRef.current = Date.now()
          try {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(action.id))
          } catch (_) {}
          // ✅ Delay mínimo para que el browser procese el evento correctamente
          setTimeout(() => {
            setDraggingActionId(action.id)
          }, 0)
        }}
        onDragEnd={(e) => {
          try {
            e.dataTransfer.clearData && e.dataTransfer.clearData()
          } catch (_) {}
          setDraggingActionId(null)
          setDropState('')
          dragStartTimeRef.current = null
        }}
        className={`group rounded-xl border bg-white shadow-sm transition-all ${
          isDragging ? 'opacity-50 scale-[0.98]' : 'hover:shadow-md'
        } ${isSavingThis ? 'ring-2 ring-emerald-300' : ''}`}
      >
        <div className="p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium">{action.nc || `NC-${action.id}`}</span>
                {action.accion_previa_id ? (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100">Hija de #{action.accion_previa_id}</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100">Raíz</span>
                )}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900 break-words">{action.accion || 'Sin título'}</div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{formatKanbanState(action.estado_accion)}</div>
              {canDrag && <div className="text-[11px] text-slate-400">Arrastrar</div>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Comentario</div>
              <div className="text-slate-700 break-words whitespace-pre-wrap">{action.contenido_comentario || '—'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Acciones futuras</div>
              <div className="text-slate-700 break-words whitespace-pre-wrap">{action.acciones_futuras_propuestas || '—'}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              {hasRole(user, 'responsable') ? (
                <EditableEstado
                  action={action}
                  onUpdated={(updated) => {
                    setThreads(prev => prev.map(t => t.id === updated.id ? updated : t))
                    showToast({ title: 'Acción actualizada', message: 'Estado guardado', type: 'success' })
                  }}
                />
              ) : (
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(action.estado_accion)}`}>
                  {formatKanbanState(action.estado_accion)}
                </div>
              )}
              <button
                onClick={() => setShowChildren(v => !v)}
                className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50"
              >
                {showChildren ? 'Ocultar subacciones' : `Ver subacciones (${children.length})`}
              </button>
            </div>
            {hasRole(user, 'responsable') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpenForm(o => !o)}
                  className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50"
                >
                  Agregar hija
                </button>
                <button
                  onClick={() => {
                    setOpenEdit(o => !o)
                    setForm({
                      accion: action.accion || '',
                      contenido_comentario: action.contenido_comentario || '',
                      estado_accion: action.estado_accion || 'Pendiente',
                      acciones_futuras_propuestas: action.acciones_futuras_propuestas || '',
                      requiere_nueva_nc: !!action.requiere_nueva_nc
                    })
                  }}
                  className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (typeof onRequestDelete === 'function') {
                      onRequestDelete(action.id)
                    }
                  }}
                  className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>

          {showChildren && children.length > 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 space-y-2">
              {children.map(child => (
                <div key={child.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 text-xs border">
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-medium">#{child.id}</span> {child.accion || 'Sin título'}
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-slate-100 shrink-0">{formatKanbanState(child.estado_accion)}</div>
                </div>
              ))}
            </div>
          )}

          {openForm && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium">Crear acción hija</div>
              <input
                placeholder="Acción"
                value={form.accion}
                onChange={e => setForm({ ...form, accion: e.target.value })}
                className="w-full px-2 py-1 border rounded mb-2 text-sm"
              />
              <textarea
                placeholder="Comentario"
                value={form.contenido_comentario}
                onChange={e => setForm({ ...form, contenido_comentario: e.target.value })}
                className="w-full px-2 py-1 border rounded mb-2 text-sm"
              />
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={form.estado_accion}
                  onChange={e => setForm({ ...form, estado_accion: e.target.value })}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En_Progreso">En_Progreso</option>
                  <option value="Eficaz">Eficaz</option>
                  <option value="No_Eficaz">No_Eficaz</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('nc:createRoot', { detail: form })
                    )
                    setOpenForm(false)
                    setForm({
                      accion: '',
                      contenido_comentario: '',
                      estado_accion: 'Pendiente',
                      acciones_futuras_propuestas: '',
                      requiere_nueva_nc: false
                    })
                  }}
                  className="px-3 py-1 bg-[#00236f] text-white text-sm rounded"
                >
                  Crear
                </button>
                <button onClick={() => setOpenForm(false)} className="px-3 py-1 border rounded text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {openEdit && (
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium">Editar acción</div>
              <input
                placeholder="Acción"
                value={form.accion}
                onChange={e => setForm({ ...form, accion: e.target.value })}
                className="w-full px-2 py-1 border rounded mb-2 text-sm"
              />
              <textarea
                placeholder="Comentario"
                value={form.contenido_comentario}
                onChange={e => setForm({ ...form, contenido_comentario: e.target.value })}
                className="w-full px-2 py-1 border rounded mb-2 text-sm"
              />
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={form.estado_accion}
                  onChange={e => setForm({ ...form, estado_accion: e.target.value })}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En_Progreso">En_Progreso</option>
                  <option value="Eficaz">Eficaz</option>
                  <option value="No_Eficaz">No_Eficaz</option>
                </select>
                <input
                  placeholder="Acciones futuras"
                  value={form.acciones_futuras_propuestas}
                  onChange={e => setForm({ ...form, acciones_futuras_propuestas: e.target.value })}
                  className="px-2 py-1 border rounded text-sm flex-1"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.requiere_nueva_nc}
                    onChange={e => setForm({ ...form, requiere_nueva_nc: e.target.checked })}
                  />
                  Requiere nueva NC
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const payload = {
                        accion: form.accion,
                        contenido_comentario: form.contenido_comentario,
                        acciones_futuras_propuestas: form.acciones_futuras_propuestas,
                        requiere_nueva_nc: form.requiere_nueva_nc ? 1 : 0,
                        estado_accion: form.estado_accion
                      }
                      const res = await fetchWithAuth(`/api/acciones/${action.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                      })
                      if (res.ok) {
                        const updated = await res.json()
                        setThreads(prev => prev.map(t => Number(t.id) === Number(updated.id) ? updated : t))
                        showToast({ title: 'Acción guardada', message: 'Cambios guardados', type: 'success' })
                        setOpenEdit(false)
                      } else {
                        const err = await res.json().catch(() => null)
                        showToast({ title: 'Error', message: getErrorText(err, 'No se pudo guardar acción'), type: 'error' })
                      }
                    } catch (e) {
                      console.error('save edit action error', e)
                      showToast({ title: 'Error', message: 'Error al guardar acción', type: 'error' })
                    }
                  }}
                  className="px-3 py-1 bg-[#00236f] text-white text-sm rounded"
                >
                  Guardar
                </button>
                <button onClick={() => setOpenEdit(false)} className="px-3 py-1 border rounded text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'all' ? 'bg-slate-200' : 'bg-white'}`}
          >
            Ver todo
          </button>
          <button
            onClick={() => setViewMode('eficacia')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'eficacia' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Ver Eficacia
          </button>
          <button
            onClick={() => setViewMode('progreso')}
            className={`px-3 py-1 rounded text-sm ${viewMode === 'progreso' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
          >
            Ver Progreso
          </button>
        </div>
      </div>

      <div className="mb-3 text-xs text-slate-500">
        Arrastra una tarjeta a otra columna para cambiar su estado. Las acciones conservan sus funciones de edición, creación de hijas e historial.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:[grid-template-columns:repeat(4,minmax(16rem,1fr))] gap-2">
        {KANBAN_STATES.filter(s => {
          if (viewMode === 'all') return true
          if (viewMode === 'eficacia') return ['Eficaz', 'No_Eficaz'].includes(s)
          if (viewMode === 'progreso') return ['Pendiente', 'En_Progreso'].includes(s)
          return true
        }).map(state => {
          const items = actionsByState[state] || []
          const isOver = dropState === state

          return (
            <div
              key={state}
              onDragEnter={(e) => {
                e.preventDefault()
                dragCounterRef.current++
                setDropState(state)
              }}
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDragLeave={(e) => {
                dragCounterRef.current--
                // ✅ Solo limpia si el contador es 0 (realmente salió de la columna)
                if (dragCounterRef.current === 0) {
                  setDropState('')
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                dragCounterRef.current = 0
                setDropState('')

                let draggingId = null
                try {
                  draggingId = e.dataTransfer.getData('text/plain')
                } catch (_) {
                  draggingId = null
                }
                if (!draggingId) draggingId = draggingActionId

                if (draggingId != null && draggingId !== '') {
                  updateActionState(draggingId, state)
                }
                setDraggingActionId(null)
              }}
              className={`rounded-xl border bg-slate-50 p-2 min-h-[12rem] transition-all ${
                isOver ? 'ring-2 ring-blue-400 border-blue-400 bg-blue-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <div className="font-semibold text-sm">{formatKanbanState(state)}</div>
                <div className="text-xs px-2 py-0.5 rounded-full bg-white border">{items.length}</div>
              </div>
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-xs text-slate-400">
                    Sin acciones
                  </div>
                ) : (
                  items.map(action => (
                    <ActionCard key={action.id} action={action} onRequestDelete={onRequestDelete} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
