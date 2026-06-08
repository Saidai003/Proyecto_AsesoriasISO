import React, { useMemo, useState } from 'react'

export default function EvidenceHistoryModal({ open, title, subtitle, logs, loading, onClose, actionLabels }){
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const labels = {
    UPLOAD: 'Subida',
    DELETE: 'Eliminación',
    UPDATE: 'Actualización',
    REPLACE: 'Reemplazo',
    APPROVAL: 'Aprobación'
  }

  const actionTypes = useMemo(() => {
    return [...new Set((logs || []).map(l => l.tipo_accion).filter(Boolean))].sort()
  }, [logs])

  const labelForType = (type) => actionLabels?.[type] || labels[type] || type

  const filteredLogs = useMemo(() => {
    const q = (search || '').toLowerCase().trim()
    return (logs || []).filter(h => {
      if(actionFilter && h.tipo_accion !== actionFilter) return false
      if(statusFilter && h.estado_validacion_archivo !== statusFilter) return false
      if(!q) return true
      const haystack = [h.usuario_nombre, h.detalle, h.tipo_accion, h.nombre_archivo, h.estado_validacion_archivo].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [logs, search, actionFilter, statusFilter])

  if(!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg w-full max-w-6xl p-4 h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">{title || 'Historial de evidencia'}</h4>
          <button onClick={onClose} className="px-2 py-1 border rounded">Cerrar</button>
        </div>
        {subtitle && <div className="text-sm text-slate-600 mb-2">{subtitle}</div>}
        <div className="grid gap-2 md:grid-cols-3 mb-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar historial..."
            className="px-3 py-2 border rounded text-sm w-full"
          />
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 border rounded text-sm w-full">
            <option value="">Todos los tipos</option>
            {actionTypes.map(type => <option key={type} value={type}>{labelForType(type)}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded text-sm w-full">
            <option value="">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Aceptado">Aceptado</option>
            <option value="Rechazado">Rechazado</option>
          </select>
        </div>
        <div className="flex-1 overflow-auto border rounded p-2 bg-slate-50">
          {loading ? (
            <div>Cargando...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-sm text-slate-500">No hay registros de historial.</div>
          ) : (
            <>
              <div className="mb-2 text-xs text-slate-500">{filteredLogs.length} registro(s) encontrados</div>
              <ul className="space-y-2">
                {filteredLogs.map(h => (
                  <li key={`${h.id}-${h.fecha_accion}`} className="p-2 border rounded bg-white">
                    <div className="text-sm"><strong>{h.usuario_nombre || 'Sistema'}</strong> — <span className="text-slate-500 text-xs">{new Date(h.fecha_accion).toLocaleString()}</span></div>
                    <div className="text-sm mt-1">
                      {labelForType(h.tipo_accion)}
                      {h.nombre_archivo ? <span className="text-slate-500"> • {h.nombre_archivo}</span> : null}
                    </div>
                    {h.detalle ? (
                      <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                        {h.detalle.split(/\r?\n|; /).map((part, index) => (
                          <div key={index}>{part}</div>
                        ))}
                      </div>
                    ) : null}
                    {(!h.detalle && h.estado_validacion_archivo) && <div className="mt-1 text-sm text-slate-700">Estado actual: {h.estado_validacion_archivo}</div>}
                    {h.estado_validacion_archivo ? <div className="text-xs text-slate-500 mt-1">Estado: {h.estado_validacion_archivo}</div> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
