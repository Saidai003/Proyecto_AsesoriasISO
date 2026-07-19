// Simple fetch wrapper that retries once after refresh if server returns 401

// this whole function purpouse is to add the token to the request and 
// handle the refresh flow automatically when a 401 is encountered. 
// It abstracts away the token management and refresh logic from the 
// rest of the app, allowing API calls to be made with a simple fetchWithAuth
//  function that takes care of authentication behind the scenes.

// In a few words, it replaces the standard fetch function with one that
// automatically includes the access token

// is there any library that could do this without using our fetchWithAuth?

// Yes, there are libraries like Axios that support interceptors, 
// which can be used to automatically attach tokens to requests 
// and handle refresh logic. However, using a custom fetch wrapper 
// like fetchWithAuth allows for more control and avoids adding an 
// additional dependency to the project.
export async function fetchWithAuth(input, init = {}){
  // Prefer explicit VITE_API_BASE; in local dev fall back to localhost:3000
  // In development use relative paths so Vite dev server proxy can forward requests
  const envBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL
  const isDev = import.meta.env.DEV
  // In development use relative paths so Vite dev server proxy forwards requests
  // In production, default to relative paths (same domain) if no envBase is provided
  const API_BASE = isDev ? '' : (envBase || '')
  // If current page includes a workspace query param (e.g. /lobby?workspace=123)
  // forward it to backend so Admin can request data scoped to that workspace.
  const appendWorkspaceFromLocation = (u) => {
    try{
      if(typeof window === 'undefined') return u
      const params = new URLSearchParams(window.location.search)
      let ws = params.get('workspace')
      if(!ws){
        try{ ws = sessionStorage.getItem('actingWorkspace') }catch(_){ ws = null }
      }
      if(!ws) return u
      const sep = u.includes('?') ? '&' : '?'
      return `${u}${sep}workspace=${encodeURIComponent(ws)}`
    }catch(e){ return u }
  }

  const baseUrl = input.startsWith('http') ? input : `${API_BASE}${input}`
  const url = appendWorkspaceFromLocation(baseUrl)
  const token = localStorage.getItem('accessToken')
  try{ console.debug('fetchWithAuth -> url=', url, 'localTokenExists=', !!token) }catch(e){}

  // If there's no access token but a refresh cookie may exist, try refreshing first
  let currentToken = token
  if(!currentToken){
    try{
      console.debug('fetchWithAuth: no token, attempting /auth/refresh')
      const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      console.debug('fetchWithAuth: refresh response status=', r.status)
      if(r.ok){
        const body = await r.json().catch(()=>null)
        console.debug('fetchWithAuth: refresh body=', body)
        if(body && body.accessToken){
          localStorage.setItem('accessToken', body.accessToken)
          currentToken = body.accessToken
          try{ window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: currentToken })) }catch(e){}
        }
      }
    }catch(e){ console.debug('fetchWithAuth: refresh error', e) }
  }

  // here at headers, we set the Authorization header with the token 
  // if it exists
  // init comes from the caller and can include method, body, etc. but 
  // we ensure credentials: 'include' is set by default to send cookies 
  // for refresh
  // what's the caller?
  // the caller is any code that uses fetchWithAuth to make API requests,
  // such as AuthContext.jsx for login/logout and other API calls in the app
  const headers = new Headers(init.headers || {})
  if(currentToken) headers.set('Authorization', `Bearer ${currentToken}`)
  // No workspace override header is sent (use explicit workspace_id in requests)

  // here, ... and init is the spread operator that takes all properties from the init object
  // and includes them in the new object we pass to fetch. This allows the caller to specify
  // method, body, and other options while we ensure headers and credentials are set correctly.

  // What does init contain? 
  // init is the object that is passed to fetchWithAuth, which is a function.
  // It can contain any options that the caller wants to specify for the 
  // fetch request, such as:
  // - method: 'GET', 'POST', etc.
  // - body: the request payload for POST/PUT requests
  // - headers: any additional headers the caller wants to include (we merge this with our Authorization header)
  // - credentials: if the caller wants to override the default 'include' for cookies

  // here, double '?' is the nullish coalescing operator that provides a default value of 
  // 'include' for credentials
  // What is 'include'?
  // 'include' is a value for the credentials option in fetch that tells the browser to include cookies
  // in the request, even for cross-origin requests. This is necessary for our refresh token flow
  // because the refresh endpoint relies on cookies to authenticate the request and issue a new access token.
  const res = await fetch(url, { ...init, headers, credentials: init.credentials ?? 'include' })
  if(res.status !== 401) return res
  try{ console.debug('fetchWithAuth: received 401 for', url) }catch(e){}

  // on 401, try refresh once
  const r = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
  console.debug('fetchWithAuth: attempted refresh after 401, status=', r.status)
  if(!r.ok) return res
  const body = await r.json().catch(()=>null)
  console.debug('fetchWithAuth: refresh-after-401 body=', body)
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
