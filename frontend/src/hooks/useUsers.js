import { useState, useCallback } from 'react'
import fetchWithAuth from '../lib/api'

export default function useUsers(){
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const loadUsers = useCallback(async ()=>{
    setLoading(true)
    try{
      const res = await fetchWithAuth('/api/users')
      if(!res.ok) throw res
      const data = await res.json()
      setUsers(data)
    }catch(err){
      console.error('loadUsers error', err)
    }finally{ setLoading(false) }
  },[])

  const createUser = useCallback(async (payload)=>{
    const res = await fetchWithAuth('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if(!res.ok) throw await res.json()
    await loadUsers()
    return await res.json()
  },[loadUsers])

  const updateUser = useCallback(async (id, payload)=>{
    const res = await fetchWithAuth(`/api/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if(!res.ok) throw await res.json()
    await loadUsers()
    return await res.json()
  },[loadUsers])

  const deleteUser = useCallback(async (id)=>{
    const res = await fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' })
    if(!res.ok) throw await res.json()
    await loadUsers()
    return await res.json()
  },[loadUsers])

  const assignWorkspace = useCallback(async (id, workspace_id)=>{
    const res = await fetchWithAuth(`/api/users/${id}/workspace`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id }) })
    if(!res.ok) throw await res.json()
    await loadUsers()
    return await res.json()
  },[loadUsers])

  return { users, loading, loadUsers, createUser, updateUser, deleteUser, assignWorkspace }
}