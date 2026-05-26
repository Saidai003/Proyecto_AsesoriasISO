import React from 'react'

export default function ChatPlaceholder(){
  const messages = [
    { id: 1, author: 'Sistema', text: 'Bienvenido al chat (placeholder).' },
    { id: 2, author: 'Responsable', text: 'Aquí aparecerán mensajes relacionados con la NC.' },
    { id: 3, author: 'Evaluador', text: 'Mensajes de ejemplo para mostrar la UI.' }
  ]
  return (
    <div className="mt-6 bg-white rounded-xl p-4 border shadow-sm">
      <h4 className="font-semibold mb-2">Chat (placeholder)</h4>
      <div className="h-40 overflow-auto p-2 border rounded bg-slate-50 space-y-2">
        {messages.map(m => (
          <div key={m.id} className="text-sm">
            <div className="text-xs text-slate-500">{m.author}</div>
            <div className="bg-white p-2 rounded">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input disabled placeholder="Escribe un mensaje..." className="flex-1 p-2 border rounded" />
        <button disabled className="px-3 py-1 bg-slate-300 text-slate-700 rounded">Enviar</button>
      </div>
    </div>
  )
}
