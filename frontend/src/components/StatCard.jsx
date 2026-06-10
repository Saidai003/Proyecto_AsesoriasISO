import React from 'react'

export default function StatCard({ title, value, note }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl relative">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      <p className="text-xs font-bold text-on-secondary-container uppercase mb-2">{title}</p>
      <h3 className="text-4xl font-black text-primary">{value}</h3>
      {note && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{note}</p>}
    </div>
  )
}