import { useState, useCallback } from 'react'
import fetchWithAuth from '../lib/api'

export default function useWorkspaces(){
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)

  const loadWorkspaces = useCallback(async ()=>{
    setLoading(true)
    try{
      const res = await fetchWithAuth('/api/workspaces')
      if(!res.ok) throw res
      const data = await res.json()
      setWorkspaces(data)
    }catch(err){
      console.error('loadWorkspaces error', err)
    }finally{ setLoading(false) }
  },[])

  createWorkspace = useCallback(async (payload)=>{
    const res = await fetchWithAuth('/api/workspaces', { method: 'POST', headers: { 'Contend-Type': 'application/json'}, body: JSON.stringify(payload)})
    if(!res.ok) throw await res.json()
    await loadWorkspaces()
    return await res.json()
  })

  return { workspaces, loading, loadWorkspaces }
}
