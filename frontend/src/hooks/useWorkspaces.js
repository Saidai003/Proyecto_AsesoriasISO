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

  const createWorkspace = useCallback(async (payload)=>{
    const res = await fetchWithAuth('/api/workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
    if(!res.ok) throw await res.json()
    await loadWorkspaces()
    return await res.json()
  }, [loadWorkspaces])

  const updateWorkspace = useCallback(async (id, payload) => {
    const res = await fetchWithAuth(`/api/workspaces/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json'}, body: JSON.stringify(payload)})
    if(!res.ok) throw await res.json()
    await loadWorkspaces()
    return await res.json()
  }, [loadWorkspaces])

  const deleteWorkspace = useCallback(async (id) => {
    const res = await fetchWithAuth(`/api/workspaces/${id}`, { method: 'DELETE' })
    if(!res.ok) throw await res.json()
    await loadWorkspaces()
    return await res.json()
  }, [loadWorkspaces])

  return { workspaces, loading, loadWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace }
}
