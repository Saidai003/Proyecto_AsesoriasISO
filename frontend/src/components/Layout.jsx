import React from 'react'
import { useAuth } from '../AuthContext'
import { useLocation, NavLink } from 'react-router-dom'

export default function Layout({ title, subtitle, sidebar, headerRight, children }){
  const { user } = useAuth()
  const location = useLocation()

  // If an admin is on the main /lobby route, normally show the simple admin
  // navigation (Dashboard / Workspaces / Users) instead of any workspace
  // specific sidebar (NavBarISO). However, if the URL includes an explicit
  // `workspace` query param (e.g. /lobby?workspace=1) we should allow the
  // workspace sidebar to be shown so admins can view a workspace as if they
  // were a Responsable/Evaluador.
  const params = new URLSearchParams(location.search || '')
  const wsRaw = params.get('workspace')
  const hasWorkspaceParam = wsRaw && String(wsRaw).trim() !== '' && !Number.isNaN(Number(wsRaw))
  const { actingWorkspace } = useAuth()
  const hasActingWorkspace = actingWorkspace && String(actingWorkspace).trim() !== '' && !Number.isNaN(Number(actingWorkspace))
  const forceAdminLobbySidebar = location && location.pathname === '/lobby' && user && (user.role || '').toLowerCase() === 'admin' && !hasWorkspaceParam && !hasActingWorkspace
  const baseClass = 'flex items-center px-3 py-2'
  const activeClass = baseClass + ' text-blue-900 font-bold border-l-4 border-blue-900 bg-slate-100'
  const inactiveClass = baseClass + ' text-slate-600'

  const adminSidebar = (
    <>
      <NavLink to="/lobby" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Panel Principal</NavLink>
      <NavLink to="/workspaces" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Espacios de Trabajo</NavLink>
      <NavLink to="/users" end className={({isActive}) => isActive ? activeClass : inactiveClass}>Usuarios</NavLink>
    </>
  )
  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <aside className="h-screen w-64 fixed left-0 top-0 bg-slate-50 border-r border-slate-200 flex flex-col py-4 z-50">
        <div className="px-6 mb-8">
          <h1 className="text-lg font-black text-blue-900 leading-tight">GAP Análisis</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">ISO 9001:2015 Portal</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <div className="text-[11px] text-slate-400 mb-2">Sidebar source: {forceAdminLobbySidebar ? 'admin' : 'provided'}</div>
          {forceAdminLobbySidebar ? adminSidebar : sidebar}
        </nav>
      </aside>
      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="w-full h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-md flex justify-end items-center px-8 shadow-sm">
          <div className="flex items-center gap-4">
            {headerRight}
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
