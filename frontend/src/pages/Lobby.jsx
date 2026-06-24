import React from 'react'
import { useAuth } from '../AuthContext'
import { hasRole } from '../lib/userUtils'
import LobbyAdmin from './lobby/LobbyAdmin'
import LobbyEvaluator from './lobby/LobbyEvaluator'
import LobbyResponsible from './lobby/LobbyResponsible'
import LobbyOperative from './lobby/LobbyOperative'

export default function Lobby(){
  const { user } = useAuth()
  if(!user) return <div className="p-6">Acceso no autorizado</div>
  if(hasRole(user, 'admin')) return <LobbyAdmin />
  if(hasRole(user, 'evaluador')) return <LobbyEvaluator />
  if(hasRole(user, 'responsable')) return <LobbyResponsible />
  if(hasRole(user, 'operativo')) return <LobbyOperative />

  return <LobbyOperative />
}
