import React, {useState} from 'react'
import Login from './pages/Login'
import ActivateAccount from './pages/ActivateAccount'
import UsersManager from './pages/UsersManager'
import WorkspacesManager from './pages/WorkspacesManager'

export default function App() {
  const [page, setPage] = useState('login')
  return (
    <div>
      <nav className="p-4 bg-white/60 border-b flex gap-4">
        <button onClick={() => setPage('login')} className="px-3 py-1 rounded">Login</button>
        <button onClick={() => setPage('activate')} className="px-3 py-1 rounded">Activate</button>
        <button onClick={() => setPage('users')} className="px-3 py-1 rounded">Users</button>
        <button onClick={() => setPage('workspaces')} className="px-3 py-1 rounded">Workspaces</button>
      </nav>
      <div>
        {page === 'login' && <Login />}
        {page === 'activate' && <ActivateAccount />}
        {page === 'users' && <UsersManager />}
        {page === 'workspaces' && <WorkspacesManager />}
      </div>
    </div>
  )
}
