import React from 'react'
import { AuthProvider } from './AuthContext'
import Login from './pages/Login'
import ActivateAccount from './pages/ActivateAccount'
import UsersManager from './pages/UsersManager'
import WorkspacesManager from './pages/WorkspacesManager'
import Lobby from './pages/Lobby'
import Protected from './components/Protected'
import RequirementView from './pages/RequirementView'
import NCView from './pages/NCView'
import Settings from './pages/Settings'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Toast from './components/Toast'

export default function App(){
  const navigate = useNavigate()

  return (
    <AuthProvider>
      <Toast />
      <Routes>
        <Route path="/login" element={<Login onLogin={()=>navigate('/lobby')} />} />
        <Route path="/activate" element={<ActivateAccount/>} />
        <Route path="/lobby" element={<Protected><Lobby/></Protected>} />
        <Route path="/requisitos/:id" element={<Protected><RequirementView/></Protected>} />
        <Route path="/nc/:id" element={<Protected><NCView/></Protected>} />
        <Route path="/settings" element={<Protected allowNoWorkspace><Settings/></Protected>} />
        <Route path="/" element={<Navigate to="/lobby" replace/>} />
        <Route path="/users" element={<Protected role="Admin"><UsersManager/></Protected>} />
        <Route path="/workspaces" element={<Protected role="Admin"><WorkspacesManager/></Protected>} />
      </Routes>
    </AuthProvider>
  )
}
