import React from 'react'
import { AuthProvider } from './AuthContext'
import Login from './pages/Login'
import ActivateAccount from './pages/ActivateAccount'
import UsersManager from './pages/UsersManager'
import WorkspacesManager from './pages/WorkspacesManager'
import Lobby from './pages/Lobby'
import Protected from './components/Protected'
import { Routes, Route, Navigate } from 'react-router-dom'

export default function App(){
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login onLogin={()=>{window.location.href='/lobby'}}/>} />
        <Route path="/activate" element={<ActivateAccount/>} />
        <Route path="/api/users" element={<UsersManager/>} />
        <Route path="/workspaces" element={<WorkspacesManager/>} />
        <Route path="/lobby" element={<Protected><Lobby/></Protected>} />
        <Route path="/" element={<Navigate to="/lobby" replace/>} />
      </Routes>
    </AuthProvider>
  )
}
