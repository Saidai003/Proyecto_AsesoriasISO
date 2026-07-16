import React, { useState, useRef } from 'react'
import { useAuth } from '../AuthContext'
import fetchWithAuth from '../lib/api'
import { showToast } from '../lib/ui'

export default function UploadArea({ evaluacionId, onUploaded }){
  const { user } = useAuth()
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  // use shared showToast helper

  const readAsDataURL = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = reject
    fr.readAsDataURL(file)
  })

  const uploadFile = async (file) => {
    if(!file) return
    if(!evaluacionId){
      showToast({ title: 'Evidencias', message: 'No se pudo determinar la evaluacion', type: 'warning', ttl: 4000 })
      return
    }
    setUploading(true)
    try{
      const fileData = await readAsDataURL(file)
      const payload = {
        evaluacion_requisito_id: evaluacionId,
        nombre_archivo: file.name,
        tipo_formato: (file.name.split('.').pop() || '').toLowerCase(),
        fileData
      }
      const res = await fetchWithAuth('/api/evidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({}))
        if(err && err.error === 'drive_not_authorized' && err.authUrl){
          showToast({ title: 'Google Drive', message: 'Autorice Drive para cargar evidencias.', type: 'warning', ttl: 6000 })
        }else{
          showToast({ title: 'Error', message: err.error || res.statusText || 'No se pudo cargar evidencia', type: 'error', ttl: 6000 })
        }
        return
      }
      const created = await res.json()
      if(typeof onUploaded === 'function') onUploaded(created)
      showToast({ title: 'Evidencia cargada', message: file.name, type: 'success', ttl: 3500 })
    }catch(err){
      console.error('upload evidence error', err)
      showToast({ title: 'Error', message: 'Error cargando evidencia', type: 'error', ttl: 6000 })
    }finally{
      setUploading(false)
    }
  }

  const onFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if(file) uploadFile(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files && e.dataTransfer.files[0]
    if(file) uploadFile(file)
  }

  const canUpload = Boolean(user) && !uploading

  return (
    <div className={`border rounded p-3 mb-3 ${dragOver ? 'bg-slate-100 border-blue-500' : 'bg-slate-50'}`} onDragOver={(e)=>{ e.preventDefault(); setDragOver(true) }} onDragLeave={()=>setDragOver(false)} onDrop={onDrop}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="text-sm font-medium">Subir evidencia</div>
          <div className="text-xs text-slate-500">Arrastra un archivo o usa el boton</div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" onChange={onFileChange} className="hidden" />
          <button disabled={!canUpload} onClick={()=> fileRef.current && fileRef.current.click()} className={`px-3 py-1 rounded text-sm ${canUpload ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'}`}>
            {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
          </button>
        </div>
      </div>
    </div>
  )
}
