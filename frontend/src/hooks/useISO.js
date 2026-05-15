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
      // New unified tree endpoint returns { iso, clauses }
      const res = await fetchWithAuth(`/api/isos/${isoId}/tree`)
      if(!res.ok) throw res
      const data = await res.json()
      const clauses = data.clauses || []
      // store clauses per ISO
      setClausesByIso(prev=>({ ...prev, [isoId]: clauses }))
      // also populate requisitosByClausula for fast lookup by clause id
      setRequisitosByClausula(prev => {
        //prev is an object keyed by clauseId with requisitos array 
        // as value; we want to add requisitos for each clause in this ISO
        const next = { ...prev }
        for(const c of clauses){
          // when we call next[c.id] we are setting 
          // requisitosByClausula[clauseId] = requisitosArray of that clause
          next[c.id] = c.requisitos || []
        }
        return next
      })
      return clauses
    }catch(err){
      console.error('loadClauses error', err)
      throw err
    }finally{ setLoading(false) }
  },[])

  const loadRequisitos = useCallback(async (clausulaId)=>{
    setLoading(true)
    try{
      // Try to find requisitos in cached clauses first
      for(const isoId of Object.keys(clausesByIso)){
        const clauses = clausesByIso[isoId] || []
        const found = clauses.find(c => String(c.id) === String(clausulaId))
        if(found){
          const requisitos = found.requisitos || []
          setRequisitosByClausula(prev=>({ ...prev, [clausulaId]: requisitos }))
          return requisitos
        }
      }
      // Fallback: no cached clause — instruct caller to load clauses for the ISO first
      throw new Error('clause_not_cached')
    }catch(err){
      console.error('loadRequisitos error', err)
      throw err
    }finally{ setLoading(false) }
  },[])

  return { isos, clausesByIso, requisitosByClausula, loading, loadISOs, loadClauses, loadRequisitos }
}
