import React from 'react'

export default function EvidenceHistoryModal({ open, title, subtitle, logs, loading, onClose, actionLabels }){
  if(!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg w-full max-w-6xl p-4 h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">{title || 'Historial de evidencia'}</h4>
          <button onClick={onClose} className="px-2 py-1 border rounded">Cerrar</button>
        </div>
        {subtitle && <div className="text-sm text-slate-600 mb-2">{subtitle}</div>}
        <div className="flex-1 overflow-auto border rounded p-2 bg-slate-50">
          {loading ? (
            <div>Cargando...</div>
          ) : (logs || []).length === 0 ? (
            <div className="text-sm text-slate-500">No hay registros de historial.</div>
          ) : (
            <ul className="space-y-2">
              {logs.map(h => (
                <li key={`${h.id}-${h.fecha_accion}`} className="p-2 border rounded bg-white">
                  <div className="text-sm"><strong>{h.usuario_nombre || 'Sistema'}</strong> — <span className="text-slate-500 text-xs">{new Date(h.fecha_accion).toLocaleString()}</span></div>
                  <div className="text-sm mt-1">{(actionLabels && actionLabels[h.tipo_accion]) || h.tipo_accion}</div>
                  {h.estado_validacion_archivo && <div className="text-xs text-slate-500 mt-1">Estado: {h.estado_validacion_archivo}</div>}
                  {h.detalle ? <div className="mt-1 text-sm text-slate-700">{h.detalle}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
