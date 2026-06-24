import React, { useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../AuthContext'
import fetchWithAuth from '../lib/api'
import { showToast } from '../lib/toast'

export default function Settings(){
  const { user, logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if(password !== confirmPassword){
      showToast({ title: 'Error', message: 'Las contraseñas nuevas no coinciden.', type: 'error' })
      return
    }
    if(!currentPassword || !password){
      showToast({ title: 'Error', message: 'Completa todos los campos para cambiar la contraseña.', type: 'warning' })
      return
    }
    setLoading(true)
    try{
      const res = await fetchWithAuth(`/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password })
      })
      const data = await res.json().catch(() => ({}))
      if(!res.ok){
        const message = data.error === 'invalid_current_password'
          ? 'La contraseña actual no es correcta.'
          : data.error === 'password_required'
            ? 'Ingresa una contraseña válida.'
            : data.error || 'No se pudo cambiar la contraseña.'
        showToast({ title: 'Error', message, type: 'error' })
        return
      }
      showToast({ title: 'Listo', message: 'Contraseña actualizada correctamente.', type: 'success' })
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    }catch(err){
      console.error('settings submit error', err)
      showToast({ title: 'Error', message: 'No se pudo cambiar la contraseña.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try{
      await logout()
    }catch(err){
      console.error('logout error', err)
    }
  }

  return (
    <Layout title="Ajustes personales" subtitle="Cambia tu contraseña o cierra sesión desde aquí." sidebar={null}>
      <div className="grid gap-8 max-w-3xl">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em]">Usuario</p>
              <p className="text-xl font-bold text-slate-900">{user?.nombre || 'Usuario'}</p>
              <p className="text-sm text-slate-600">{user?.email}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <span className="material-symbols-outlined text-base">person</span>
              {user?.role || 'Sin rol'}
            </span>
          </div>
          <p className="text-sm text-slate-600">Desde esta vista puedes actualizar tu contraseña y cerrar sesión de forma segura.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Cambiar contraseña</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña actual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                placeholder="Ingresa tu contraseña actual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                placeholder="Ingresa tu nueva contraseña"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-blue-100 focus:outline-none"
                placeholder="Repite la nueva contraseña"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        </section>
      </div>
    </Layout>
  )
}
