import React from 'react'
import { useAuth } from '../AuthContext'

export default function Layout({ title, subtitle, sidebar, children }){
  const { user } = useAuth()
  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 border-r border-slate-200 flex flex-col py-4 z-50">
        <div className="px-6 mb-8">
          <h1 className="text-lg font-black text-blue-900 leading-tight">GAP Análisis</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">ISO 9001:2015 Portal</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">{sidebar}</nav>
      </aside>
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="w-full h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-md flex justify-end items-center px-8 shadow-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="text-right hidden sm:block mr-4">
                <p className="text-xs font-bold text-blue-900">{user?.nombre || 'Invitado'}</p>
                <p className="text-[10px] text-slate-500 font-medium">{user?.role || ''}</p>
              </div>
              <img alt="profile" className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-900/10" src="https://www.gravatar.com/avatar?d=mp"/>
            </div>
          </div>
        </header>
        <div className="p-8 space-y-8">
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
              {subtitle && <p className="text-on-secondary-container mt-1 font-medium">{subtitle}</p>}
            </div>
          </section>
          {children}
        </div>
      </main>
    </div>
  )
}
