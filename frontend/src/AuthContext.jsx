import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdleTimer } from 'react-idle-timer'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'))
  const [user, setUser] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('user')) }catch(e){return null}
  })
  const [initializing, setInitializing] = useState(true)

  const refreshTimeoutRef = useRef(null)
  const [isIdle, setIsIdle] = useState(false)

  useEffect(()=>{
    if(accessToken) localStorage.setItem('accessToken', accessToken)
    else localStorage.removeItem('accessToken')
  },[accessToken])
  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  },[user])

  function decodeJwt(token){
    try{
      const payload = token.split('.')[1]
      const json = atob(payload.replace(/-/g,'+').replace(/_/g,'/'))
      return JSON.parse(json)
    }catch(e){ return null }
  }

  // schedule refresh 60s before expiry, but only when user is active (not idle)
  const scheduleRefresh = (token) => {
    if(refreshTimeoutRef.current){ clearTimeout(refreshTimeoutRef.current); refreshTimeoutRef.current = null }
    if(!token) return
    const p = decodeJwt(token)
    if(!p || !p.exp) return
    const expiresAt = p.exp * 1000
    // refresh 60s before expiry
    const ms = expiresAt - Date.now() - 60*1000
    const wait = Math.max(0, ms)
    if(isIdle){
      // don't schedule if idle
      return
    }
    refreshTimeoutRef.current = setTimeout(()=>{ doRefresh() }, wait)
  }

  const doRefresh = async () => {
    const envBase = import.meta.env.VITE_API_BASE
    const isDev = import.meta.env.DEV
    const API_BASE = isDev ? '' : (envBase || 'http://localhost:3000')
    try{
      const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      if(!res.ok){
        // refresh failed -> clear auth
        setAccessToken(null)
        setUser(null)
        return null
      }
      const body = await res.json()
      const newToken = body.accessToken
      setAccessToken(newToken)
      const payload = decodeJwt(newToken)
      setUser(payload ? { id: payload.id, email: payload.email, role: payload.role, workspace_id: payload.workspace_id } : null)
      // schedule next refresh based on new token
      scheduleRefresh(newToken)
      return newToken
    }catch(e){
      setAccessToken(null)
      setUser(null)
      return null
    }
  }

  //This fragment of code is responsible for handling the login process. 
  // It sends a POST request to the /auth/login endpoint with the user's email and password. 
  // If the response is successful, it stores the access token and user information in the state, 
  // which can be accessed throughout the application via the AuthContext. 
  // The logout function clears this information and also makes a request to the 
  // /auth/logout endpoint to invalidate the session on the server side.
  const login = async ({ email, password }) => {
    const envBase = import.meta.env.VITE_API_BASE
    const isDev = import.meta.env.DEV
    const API_BASE = isDev ? '' : (envBase || 'http://localhost:3000')
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    })
    if(!res.ok) throw await res.json()
    const body = await res.json()
    setAccessToken(body.accessToken)
    setUser(body.user)
    // schedule refresh on login (only if active)
    scheduleRefresh(body.accessToken)
    return body
  }

  const logout = async () => {
    const envBase = import.meta.env.VITE_API_BASE
    const isDev = import.meta.env.DEV
    const API_BASE = isDev ? '' : (envBase || 'http://localhost:3000')
    try{ await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }) }catch(e){}
    setAccessToken(null)
    setUser(null)
    if(refreshTimeoutRef.current){ clearTimeout(refreshTimeoutRef.current); refreshTimeoutRef.current = null }
  }

  // on mount: attempt refresh using cookie (if any)
  useEffect(()=>{
    let mounted = true
    async function init(){
      try{
        await doRefresh()
      }catch(e){
        setAccessToken(null); setUser(null)
      }finally{
        if(mounted) setInitializing(false)
      }
    }
    init()
    return ()=>{ mounted = false; if(refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current) }
  },[])

  // listen for refresh events from fetchWithAuth and update local state
  useEffect(()=>{
    const onRefreshed = (e) => {
      const newToken = e.detail
      if(newToken){
        setAccessToken(newToken)
        const payload = decodeJwt(newToken)
        setUser(payload ? { id: payload.id, email: payload.email, role: payload.role, workspace_id: payload.workspace_id } : null)
        scheduleRefresh(newToken)
      }
    }
    window.addEventListener('auth:refreshed', onRefreshed)
    return ()=> window.removeEventListener('auth:refreshed', onRefreshed)
  },[])

  // Use react-idle-timer to detect idle/active state and logout on idle
  const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_MINUTES || 30)
  const handleOnIdle = () => {
    setIsIdle(true)
    // clear any scheduled refresh
    if(refreshTimeoutRef.current){ clearTimeout(refreshTimeoutRef.current); refreshTimeoutRef.current = null }
    // perform logout when idle
    logout()
    try{ navigate('/login') }catch(e){}
  }
  const handleOnActive = (event) => {
    setIsIdle(false)
    // when user becomes active, schedule refresh if token exists
    if(accessToken) scheduleRefresh(accessToken)
  }
  useIdleTimer({
    timeout: IDLE_MINUTES * 60 * 1000,
    onIdle: handleOnIdle,
    onActive: handleOnActive,
    debounce: 500
  })

  // when accessToken changes and user is active, ensure schedule is set
  useEffect(()=>{
    if(accessToken && !isIdle) scheduleRefresh(accessToken)
    if(!accessToken && refreshTimeoutRef.current){ clearTimeout(refreshTimeoutRef.current); refreshTimeoutRef.current = null }
  },[accessToken, isIdle])

  return (
    <AuthContext.Provider value={{ accessToken, user, login, logout, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){ return useContext(AuthContext) }

export default AuthContext
