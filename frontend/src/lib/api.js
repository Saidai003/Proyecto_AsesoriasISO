// Simple fetch wrapper that retries once after refresh if server returns 401
export async function fetchWithAuth(input, init = {}){
  // Prefer explicit VITE_API_BASE; in local dev fall back to localhost:3000
  const envBase = import.meta.env.VITE_API_BASE
  const devFallback = (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') ? 'http://localhost:3000' : ''
  const API_BASE = envBase || devFallback || ''
  const url = input.startsWith('http') ? input : `${API_BASE}${input}`
  const token = localStorage.getItem('accessToken')
  const headers = new Headers(init.headers || {})
  if(token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(url, { ...init, headers, credentials: init.credentials ?? 'include' })
  if(res.status !== 401) return res

  // on 401, try refresh once
  const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
  if(!r.ok) return res
  const body = await r.json().catch(()=>null)
  const newToken = body && body.accessToken
  if(newToken){
    // update localStorage and notify other parts of the app
    localStorage.setItem('accessToken', newToken)
    try{ window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: newToken })) }catch(e){}
    // retry original request with new token
    const headers2 = new Headers(init.headers || {})
    headers2.set('Authorization', `Bearer ${newToken}`)
    return fetch(url, { ...init, headers: headers2, credentials: init.credentials ?? 'include' })
  }
  return res
}

export default fetchWithAuth
