import React from 'react'
import ReactDOM from 'react-dom'

/**
 * ConfirmDialog
 *
 * Props:
 *  - open: boolean
 *  - title: string
 *  - message: string | ReactNode
 *  - confirmText: string (default 'Confirmar')
 *  - cancelText: string (default 'Cancelar')
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - requireText: string | null  — si se pasa, el usuario debe escribir exactamente este texto para habilitar el botón de confirmar
 */
export default function ConfirmDialog({ open, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, requireText }){
  const [inputValue, setInputValue] = React.useState('')

  // Reset input when dialog opens/closes
  React.useEffect(() => {
    if (!open) setInputValue('')
  }, [open])

  if(!open) return null

  const needsText = typeof requireText === 'string' && requireText.length > 0
  const isConfirmEnabled = !needsText || inputValue.trim().toLowerCase() === requireText.toLowerCase()

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-6">
      <div className="bg-white rounded-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">{title || 'Confirmar'}</h4>
        </div>
        <div className="p-3 border rounded bg-slate-50 mb-4">
          <div className="text-sm text-slate-700">{message}</div>
        </div>
        {needsText && (
          <div className="mb-4">
            <label className="block text-sm text-slate-600 mb-1">
              Escribe <span className="font-bold text-red-600">"{requireText}"</span> para confirmar:
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder={requireText}
              autoFocus
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 border rounded">{cancelText}</button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmEnabled}
            className={`px-4 py-2 rounded text-white ${isConfirmEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
