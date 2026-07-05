import React from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { showToast } from '../lib/toast'

export default function ActivateAccount() {
  const { register, handleSubmit } = useForm()
  const location = useLocation()
  const navigate = useNavigate()
  const { setAccessToken, setUser } = useAuth() || {}
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)

  // userId comes from Login.jsx navigation state
  const userId = location.state?.userId || null

  const onSubmit = async (data) => {
    setError(null)

    if (!userId) {
      setError('No se pudo identificar al usuario. Vuelve al login.')
      return
    }

    if (!data.currentPassword) {
      setError('Ingresa tu contraseña actual (la asignada por el administrador).')
      return
    }

    if (!data.password || data.password.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (data.password !== data.confirm_password) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (data.password === data.currentPassword) {
      setError('La nueva contraseña debe ser diferente a la actual.')
      return
    }

    setLoading(true)
    try {
      const envBase = import.meta.env.VITE_API_BASE
      const isDev = import.meta.env.DEV
      const API_BASE = isDev ? '' : (envBase || 'http://localhost:3000')

      const res = await fetch(`${API_BASE}/auth/first-login-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          currentPassword: data.currentPassword,
          newPassword: data.password
        })
      })

      const body = await res.json()

      if (!res.ok) {
        const messages = {
          invalid_current_password: 'La contraseña actual no es correcta.',
          invalid_password_length: 'La contraseña debe tener entre 8 y 72 caracteres.',
          password_must_be_different: 'La nueva contraseña debe ser diferente a la actual.',
          too_many_attempts: 'Demasiados intentos. Espera 15 minutos.',
          already_activated: 'Esta cuenta ya fue activada. Inicia sesión normalmente.',
          not_found: 'Usuario no encontrado.',
          invalid_user_id: 'Error de identificación de usuario.'
        }
        setError(messages[body.error] || body.error || 'Error al cambiar contraseña.')
        return
      }

      // Success: backend returns { accessToken, user } + sets refreshToken cookie
      if (body.accessToken && typeof setAccessToken === 'function') {
        localStorage.setItem('accessToken', body.accessToken)
        setAccessToken(body.accessToken)
      }
      if (body.user && typeof setUser === 'function') {
        localStorage.setItem('user', JSON.stringify(body.user))
        setUser(body.user)
      }

      showToast && showToast({ title: 'Cuenta activada', message: 'Tu contraseña fue configurada exitosamente.', type: 'success' })
      navigate('/lobby')
    } catch (err) {
      console.error('ActivateAccount error', err)
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface text-on-surface">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-on-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>security</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tighter text-primary">GAP ANALISYS</span>
          </div>
          <h1 className="text-3xl font-extrabold text-on-surface">Configurar tu cuenta</h1>
          <p className="text-on-surface-variant max-w-sm">Establece una nueva contraseña para activar tu acceso a la plataforma.</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="currentPassword" className="text-label-md font-semibold uppercase tracking-widest text-on-secondary-container">Contraseña Actual</label>
                <span className="material-symbols-outlined text-outline text-lg">key</span>
              </div>
              <input id="currentPassword" type="password" placeholder="La contraseña asignada por el administrador" {...register('currentPassword')} className="w-full px-4 py-4 bg-surface-container-high rounded-lg" />
              <p className="text-xs text-on-surface-variant">Esta es la contraseña temporal que te asignó el administrador.</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-label-md font-semibold uppercase tracking-widest text-on-secondary-container">Nueva Contraseña</label>
                <span className="material-symbols-outlined text-outline text-lg">lock</span>
              </div>
              <input id="password" type="password" placeholder="Mínimo 8 caracteres" {...register('password')} className="w-full px-4 py-4 bg-surface-container-high rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="confirm_password" className="text-label-md font-semibold uppercase tracking-widest text-on-secondary-container">Confirmar Contraseña</label>
                <span className="material-symbols-outlined text-outline text-lg">verified_user</span>
              </div>
              <input id="confirm_password" type="password" placeholder="Repite la nueva contraseña" {...register('confirm_password')} className="w-full px-4 py-4 bg-surface-container-high rounded-lg" />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl disabled:opacity-50">
              {loading ? 'Activando...' : 'Activar Cuenta'}
            </button>
          </form>
        </div>
        <div className="mt-6 text-center">
          <button onClick={() => navigate('/login')} className="text-sm text-primary hover:underline">← Volver al login</button>
        </div>
      </div>
    </main>
  )
}
