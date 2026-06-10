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
      // flatten nested requisitos trees into a flat array so NavBar can filter by requisito_padre_id
      setRequisitosByClausula(prev => {
        const next = { ...prev }
        // for each clause, flatten its requisitos tree into a flat array
        //  and store by clause id
        for(const c of clauses){
          const roots = c.requisitos || []
          const flat = []
          // stack for DFS or BFS traversal of requisitos tree; here we use BFS
          // BFS meaning: we push all children of a node into the stack before 
          // processing them, which results in a level-by-level traversal
          const stack = [...roots]
          while(stack.length){
            const node = stack.shift()
            flat.push(node)
            if(node.children && node.children.length) stack.push(...node.children)
          }
          next[c.id] = flat
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
