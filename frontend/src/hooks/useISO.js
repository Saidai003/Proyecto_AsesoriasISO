import { useState, useCallback } from 'react'
import fetchWithAuth from '../lib/api'

export default function useISO(){
  const [isos, setIsos] = useState([])
  const [clausesByIso, setClausesByIso] = useState({})
  const [requisitosByClausula, setRequisitosByClausula] = useState({})
  const [loading, setLoading] = useState(false)

  const loadISOs = useCallback(async ()=>{
    setLoading(true)
    try{
      const res = await fetchWithAuth('/api/isos')
      if(!res.ok) throw res
      const data = await res.json()
      setIsos(data)
      return data
    }catch(err){
      console.error('loadISOs error', err)
      throw err
    }finally{ setLoading(false) }
  },[])

  const loadClauses = useCallback(async (isoId)=>{
    setLoading(true)
    try{
      const res = await fetchWithAuth(`/api/isos/${isoId}/clauses`)
      if(!res.ok) throw res
      const data = await res.json()
      setClausesByIso(prev=>({ ...prev, [isoId]: data }))
      return data
    }catch(err){
      console.error('loadClauses error', err)
      throw err
    }finally{ setLoading(false) }
  },[])

  const loadRequisitos = useCallback(async (clausulaId)=>{
    setLoading(true)
    try{
      const res = await fetchWithAuth(`/api/isos/clauses/${clausulaId}/requisitos`)
      if(!res.ok) throw res
      const data = await res.json()
      setRequisitosByClausula(prev=>({ ...prev, [clausulaId]: data }))
      return data
    }catch(err){
      console.error('loadRequisitos error', err)
      throw err
    }finally{ setLoading(false) }
  },[])

  return { isos, clausesByIso, requisitosByClausula, loading, loadISOs, loadClauses, loadRequisitos }
}
