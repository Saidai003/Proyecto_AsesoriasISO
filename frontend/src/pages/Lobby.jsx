import React from 'react'
import { useAuth } from '../AuthContext'
import LobbyAdmin from './lobby/LobbyAdmin'
import LobbyEvaluator from './lobby/LobbyEvaluator'
import LobbyOperative from './lobby/LobbyOperative'

export default function Lobby(){
  const { user } = useAuth()
  if(!user) return <div className="p-6">Acceso no autorizado</div>
  const role = (user.role || '').toLowerCase()
  if(role.includes('admin')) return <LobbyAdmin />
  if(role.includes('evaluador') || role.includes('evaluador')) return <LobbyEvaluator />
  // fallback responsable / operativo
  return <LobbyOperative />
}
