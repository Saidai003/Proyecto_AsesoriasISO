import React from 'react'

export default function ConfirmDialog({ open, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel }){
  if(!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">{title || 'Confirmar'}</h4>
        </div>
        <div className="p-3 border rounded bg-slate-50 mb-4">
          <div className="text-sm text-slate-700">{message}</div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
