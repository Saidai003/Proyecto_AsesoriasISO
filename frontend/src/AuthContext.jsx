import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'))
  const [user, setUser] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('user')) }catch(e){return null}
  })

  useEffect(()=>{
    if(accessToken) localStorage.setItem('accessToken', accessToken)
    else localStorage.removeItem('accessToken')
  },[accessToken])
  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  },[user])

  //This fragment of code is responsible for handling the login process. 
  // It sends a POST request to the /auth/login endpoint with the user's email and password. 
  // If the response is successful, it stores the access token and user information in the state, 
  // which can be accessed throughout the application via the AuthContext. 
  // The logout function clears this information and also makes a request to the 
  // /auth/logout endpoint to invalidate the session on the server side.
  const login = async ({ email, password }) => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    })
    if(!res.ok) throw await res.json()
    const body = await res.json()
    setAccessToken(body.accessToken)
    setUser(body.user)
    return body
  }

  const logout = async () => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    setAccessToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){ return useContext(AuthContext) }

export default AuthContext
