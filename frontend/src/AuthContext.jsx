import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIdleTimer } from 'react-idle-timer'

const AuthContext = createContext(null)

// ✅ Logging centralizado para errores de autenticación
const logAuthError = (context, error, details = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    message: error?.message || String(error),
    status: details.status,
    ...details
  }
  console.error('AUTH ERROR:', errorLog)
  // En producción: enviar a Sentry/LogRocket
  // window.Sentry?.captureException(error, { extra: errorLog })
}

// ✅ Fetch con timeout (5 segundos)
const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Timeout después de ${timeoutMs}ms`)
    }
    throw error
  }
}

export function AuthProvider({ children }){
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'))
  const [user, setUser] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('user')) }catch(e){return null}
  })
  const [initializing, setInitializing] = useState(true)
  const [actingWorkspace, setActingWorkspaceState] = useState(() => {
    try{ return sessionStorage.getItem('actingWorkspace') }catch(e){ return null }
  })

  const refreshTimeoutRef = useRef(null)
  const refreshPendingRef = useRef(false)  // ✅ Prevenir race condition
  const [isIdle, setIsIdle] = useState(false)

  useEffect(()=>{
    if(accessToken) localStorage.setItem('accessToken', accessToken)
    else localStorage.removeItem('accessToken')
  },[accessToken])
  useEffect(()=>{
    if(user) localStorage.setItem('user', JSON.stringify(user))
    else localStorage.removeItem('user')
  },[user])
  // Any changes will be reflected in sessionStorage for actingWorkspace, which is 
  // used by fetchWithAuth to append ?workspace= to API calls. This allows the app
  // to maintain an "acting workspace" context across page reloads and API calls
  // without needing to include it in the URL or manage it in a global state separately.
  // persist actingWorkspace to sessionStorage
  useEffect(()=>{
    try{
      if(actingWorkspace) sessionStorage.setItem('actingWorkspace', String(actingWorkspace))
      else sessionStorage.removeItem('actingWorkspace')
    }catch(e){}
  },[actingWorkspace])
  

  function decodeJwt(token){
    try{
      const payload = token.split('.')[1]
      const json = atob(payload.replace(/-/g,'+').replace(/_/g,'/'))
      return JSON.parse(json)
    }catch(e){ return null }
  }

  // schedule refresh 60s before expiry, but only when user is active (not idle)
  const scheduleRefresh = (token) => {
    // Validación de entrada
    if (!token || typeof token !== 'string') {
      console.warn('⚠️  scheduleRefresh: token inválido', { token: typeof token })
      return
    }

    // Prevenir race condition: ignorar si ya hay uno pendiente
    if (refreshPendingRef.current) {
      console.debug('Refresh ya pendiente, ignorando nueva solicitud')
      return
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    
    const p = decodeJwt(token)
    if (!p || !p.exp) {
      logAuthError('scheduleRefresh', 'Token decodificación falló o sin exp claim', { token: token.substring(0, 20) + '...' })
      return
    }

    const expiresAt = p.exp * 1000
    const ms = expiresAt - Date.now() - 60 * 1000
    const wait = Math.max(0, ms)
    
    if (isIdle) {
      console.debug('⏸️  Usuario idle, no programando refresh')
      return
    }

    console.debug(`Refresh programado en ${Math.round(wait / 1000)}s`)
    refreshTimeoutRef.current = setTimeout(() => { doRefresh() }, wait)
  }

  const doRefresh = async () => {
    const envBase = import.meta.env.VITE_API_BASE
    const isDev = import.meta.env.DEV
    const API_BASE = isDev ? '' : (envBase || 'http://localhost:3000')
    
    refreshPendingRef.current = true
    try {
      console.log('Iniciando token refresh...')
      const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, { 
        method: 'POST', 
        credentials: 'include' 
      }, 10000)  // Timeout de 10s para refresh

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        logAuthError('doRefresh', `Refresh rechazado por servidor`, { 
          status: res.status,
          error: error.message,
          endpoint: `${API_BASE}/auth/refresh`
        })
        setAccessToken(null)
        setUser(null)
        refreshPendingRef.current = false
        return null
      }

      const body = await res.json()
      const newToken = body.accessToken
      
      if (!newToken) {
        logAuthError('doRefresh', 'Token no recibido en respuesta', { body })
        setAccessToken(null)
        setUser(null)
        refreshPendingRef.current = false
        return null
      }

      console.log('Token refresh exitoso')
      setAccessToken(newToken)
      const payload = decodeJwt(newToken)
      setUser(payload ? { 
        id: payload.id, 
        email: payload.email, 
        role: payload.role, 
        workspace_id: payload.workspace_id 
      } : null)
      
      scheduleRefresh(newToken)
      refreshPendingRef.current = false
      return newToken
    } catch (error) {
      const errorMsg = error?.message || 'Error desconocido'
      logAuthError('doRefresh', errorMsg, { 
        endpoint: `${API_BASE}/auth/refresh`,
        errorType: error?.name 
      })
      setAccessToken(null)
      setUser(null)
      refreshPendingRef.current = false
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
    
    try {
      console.log('Iniciando login para', email)
      const res = await fetchWithTimeout(`${API_BASE}/auth/login`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      }, 10000)  // Timeout de 10s para login

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
        logAuthError('login', `Login rechazado`, { 
          email,
          status: res.status,
          error: error.message || error,
          endpoint: `${API_BASE}/auth/login`
        })
        throw error
      }

      const body = await res.json()
      console.log('Login exitoso para', email)
      
      setAccessToken(body.accessToken)
      setUser(body.user)
      scheduleRefresh(body.accessToken)
      return body
    } catch (error) {
      const errorMsg = error?.message || 'Error desconocido en login'
      logAuthError('login', errorMsg, { 
        email,
        endpoint: `${API_BASE}/auth/login`,
        errorType: error?.name
      })
      throw error
    }
  }

  const logout = async () => {
    const envBase = import.meta.env.VITE_API_BASE
    const isDev = import.meta.env.DEV
    const API_BASE = isDev ? '' : (envBase || 'http://localhost:3000')
    
    try {
      console.log('Iniciando logout...')
      await fetchWithTimeout(`${API_BASE}/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      }, 5000)  // Timeout de 5s para logout
      console.log('Logout exitoso en servidor')
    } catch (error) {
      logAuthError('logout', `Error en logout (continuando localmente)`, { 
        endpoint: `${API_BASE}/auth/logout`,
        errorType: error?.name,
        message: error?.message
      })
      // Continuar con logout local incluso si falla el servidor
    } finally {
      // Siempre limpiar estado local
      setAccessToken(null)
      setUser(null)
      setActingWorkspaceState(null)
      refreshPendingRef.current = false
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
    }
  }

  

  // on mount: attempt refresh using cookie (if any)
  useEffect(() => {
    let mounted = true
    async function init() {
      try {
        console.log('Inicializando autenticación...')
        await doRefresh()
        if (mounted) console.log('✅ Autenticación inicializada')
      } catch (error) {
        logAuthError('init', 'Error en inicialización de autenticación', { 
          errorType: error?.name,
          message: error?.message 
        })
        setAccessToken(null)
        setUser(null)
      } finally {
        if (mounted) setInitializing(false)
      }
    }
    init()
    return () => {
      mounted = false
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  // listen for refresh events from fetchWithAuth and update local state
  useEffect(() => {
    const onRefreshed = (e) => {
      const newToken = e.detail
      if (newToken) {
        console.log('📡 Token refrescado via evento')
        setAccessToken(newToken)
        const payload = decodeJwt(newToken)
        setUser(payload ? { 
          id: payload.id, 
          email: payload.email, 
          role: payload.role, 
          workspace_id: payload.workspace_id 
        } : null)
        scheduleRefresh(newToken)
      } else {
        logAuthError('onRefreshed', 'Evento sin token válido', { event: e })
      }
    }
    window.addEventListener('auth:refreshed', onRefreshed)
    return () => window.removeEventListener('auth:refreshed', onRefreshed)
  }, [])

  // Use react-idle-timer to detect idle/active state and logout on idle
  const IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_MINUTES || 30)
  const handleOnIdle = () => {
    console.warn(`⏸Usuario inactivo por ${IDLE_MINUTES} minutos, logout automático`)
    setIsIdle(true)
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    logout()
    try { navigate('/login') } catch (e) {
      logAuthError('handleOnIdle', 'Error navegando a login', { error: e?.message })
    }
  }
  const handleOnActive = async (event) => {
    console.log('Usuario reactivo detectado')
    setIsIdle(false)
    // Hacer refresh INMEDIATO si token existe y podría haber expirado
    if (accessToken) {
      // Validar que token no expiró durante inactividad
      const payload = decodeJwt(accessToken)
      if (payload && payload.exp) {
        const expiresAt = payload.exp * 1000
        const msUntilExpiry = expiresAt - Date.now()
        if (msUntilExpiry < 60 * 1000) {
          console.warn('Token a punto de expirar, refrescando inmediatamente...')
          await doRefresh()
        } else {
          scheduleRefresh(accessToken)
        }
      } else {
        console.error('Token inválido al reactivarse')
        setAccessToken(null)
      }
    }
  }
  useIdleTimer({
    timeout: IDLE_MINUTES * 60 * 1000,
    onIdle: handleOnIdle,
    onActive: handleOnActive,
    debounce: 500
  })

  // when accessToken changes and user is active, ensure schedule is set
  useEffect(() => {
    if (accessToken && !isIdle) {
      console.debug('Token disponible y usuario activo, programando refresh')
      scheduleRefresh(accessToken)
    }
    if (!accessToken && refreshTimeoutRef.current) {
      console.debug('Token limpiado, cancelando refresh programado')
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [accessToken, isIdle])

  const setActingWorkspace = (ws) => setActingWorkspaceState(ws ? String(ws) : null)

  return (
    <AuthContext.Provider value={{ accessToken, token: accessToken, user, login, logout, initializing, actingWorkspace, setActingWorkspace }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(){ return useContext(AuthContext) }

export default AuthContext


// what does useContext(AuthContext) return, exactly?
// It returns the value provided by the nearest AuthContext.Provider
// in the component tree.

// AuthContext is initialized with createContext(null), 
// so if there is no Provider, it will return null.

// In our case, the AuthProvider component provides an object with 
// { accessToken, user, login, logout, initializing } as the value.

// Why does it provide these specific values and not null anymore?
// Because the AuthProvider component is designed to manage authentication state and actions. 
// It provides the current access token, user information, and functions to log in and log out, 
// as well as an initializing flag to indicate if it's still checking for an existing session. 
// This allows any component that consumes this context to easily access authentication-related 
// data and functions without needing to pass them down through props.

// Lets see if i understand correctly. const AuthContext = createContext(null)
// creates a new context object called AuthContext with a default value of null.
// This means that if a component tries to consume this context without being wrapped 
// in an AuthContext.Provider, it will receive null as the value, naturally, because
// there is no provider to supply a different value. However, when we use the AuthProvider
// component to wrap parts of our application, it provides a specific value (an object containing 
// accessToken, user, login, logout, and initializing) to all of its child components.
// This also means AuthContext is actually the very object returned by createContext,
//  which has a Provider component and can be consumed by useContext.

// how are the values filled tho?
// The values are filled by the AuthProvider component. When you use the AuthProvider to wrap your application,
// it initializes state variables for accessToken, user, and initializing. It also defines the login and logout functions.
// The AuthProvider then passes these values as an object to the AuthContext.Provider's value prop. 
// This way, any component that consumes the AuthContext will have access to these values and functions.

// But in order for that to happen the children components must import the useAuth hook and AuthContext, right?
// Yes, that's correct. The child components that want to access the authentication context would typically import 
// the useAuth hook, which internally uses useContext(AuthContext) to access the context values. This allows them
//  to easily access the authentication state and functions provided by the AuthProvider without needing to directly 
// interact with the AuthContext object itself.

// I also noticed Auth Context has the same name as this file, AuthContext.jsx, but that's not a coincidence, is it?
// No, it's not a coincidence. It's a common convention in React to name the context object the same as the file it is defined in. 
// This helps with organization and makes it clear where the context is coming from when it is imported and used in other parts of the application. 
// In this case, AuthContext is defined in AuthContext.jsx, and it is exported for use in other components that need to access authentication-related data and functions.

// So, in summary:
// - AuthContext is a context object created with createContext(null) in the AuthContext.jsx file.
// - The AuthProvider component is a React component that manages authentication state and provides it to its children via the AuthContext.Provider.
// - The useAuth hook is a custom hook that allows components to easily consume the AuthContext and access the authentication values and functions.
// - When a component uses the useAuth hook, it will receive the current accessToken, user information, login and logout functions, and an initializing flag from the nearest AuthContext.Provider in the component tree.
// - The AuthProvider component provides an object with { accessToken, user, login, logout, initializing } as the value.
// - Any component that consumes the AuthContext will have access to these values and functions.

// So if i did this in another file: 
// import ChatPlaceholder from '../components/ChatPlaceholder'
// import ConfirmDialog from '../components/ConfirmDialog'
// import { hasRole } from '../lib/userUtils'

// function UploadArea({ evaluacionId, onUploaded }){
//   const [dragOver, setDragOver] = React.useState(false)
//   const fileRef = React.useRef(null) //useRef for hidden file input to trigger on button click
//   const { user } = useAuth()

// user will contain accessToken, user, login, logout, initializing

// user: { id, email, role, workspace_id }
// accessToken: string
// login: function
// logout: function
// initializing: boolean -> this is a flag to indicate if the user is still checking for an existing session given a valid token