import React from 'react'
import { AuthProvider } from './AuthContext'
import Login from './pages/Login'
import ActivateAccount from './pages/ActivateAccount'
import UsersManager from './pages/UsersManager'
import WorkspacesManager from './pages/WorkspacesManager'
import Lobby from './pages/Lobby'
import Protected from './components/Protected'
import RequirementView from './pages/RequirementView'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'

export default function App(){
  const navigate = useNavigate()

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login onLogin={()=>navigate('/lobby')} />} />
        <Route path="/activate" element={<ActivateAccount/>} />
        <Route path="/lobby" element={<Protected><Lobby/></Protected>} />
        <Route path="/requisitos/:id" element={<Protected><RequirementView/></Protected>} />
        <Route path="/" element={<Navigate to="/lobby" replace/>} />
        <Route path="/users" element={<Protected role="Admin"><UsersManager/></Protected>} />
        <Route path="/workspaces" element={<Protected role="Admin"><WorkspacesManager/></Protected>} />
      </Routes>
    </AuthProvider>
  )
}
