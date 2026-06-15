import React from 'react'
import { useAuth } from '../AuthContext'
import { hasRole } from '../lib/userUtils'
import { Navigate } from 'react-router-dom'

export default function Protected({ children, role, allowNoWorkspace = false }){
  const { user, initializing, accessToken } = useAuth()
  if(initializing) return <div className="p-6">Cargando...</div>
  // If there's no authenticated token or no user info, redirect to login
  if(!user || !accessToken) return <Navigate to="/login" replace />
  if(role && !hasRole(user, role)) return <div className="p-6">No tienes permiso para ver esta página.</div>
  // require workspace assignment for non-admin users, unless this route is allowed without workspace
  if(!user.workspace_id && !hasRole(user, 'admin') && !allowNoWorkspace) return <div className="p-6">Aún no tienes un espacio de trabajo asignado. Contacta al administrador.</div>
  return <>{children}</>
}
