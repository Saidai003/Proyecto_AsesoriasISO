import React from 'react'
import { useAuth } from '../AuthContext'
import { Navigate } from 'react-router-dom'

export default function Protected({ children, role }){
  const { user } = useAuth()
  if(!user) return <Navigate to="/login" replace />
  if(role && user.role !== role) return <div className="p-6">No tienes permiso para ver esta página.</div>
  return <>{children}</>
}
