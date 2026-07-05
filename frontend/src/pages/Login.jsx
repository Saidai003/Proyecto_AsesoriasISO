import React from 'react'
import { useAuth } from '../AuthContext'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

export default function Login({ onLogin }) {
  const [error, setError] = React.useState(null)
  const { login } = useAuth() || {} 
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm({ defaultValues: { email: '', password: '' } })

  const submit = async (data) => {
    setError(null)
    try{
      const body = await login({ email: data.email, password: data.password })
      // If user needs to change password first, redirect to activate
      if (body && body.status === 'requires_password_change') {
        navigate('/activate', { state: { userId: body.userId } })
        return
      }
      // after login, go to lobby; workspace selection handled by UI/navigation
      navigate('/lobby')
    }catch(err){
      setError(err.error || 'Login failed')
    }
  }

return (
    <main className="liquid-login-shell h-full text-white antialiased flex items-center justify-center p-6 relative">
      <div className="liquid-login-blob liquid-login-blob--pink" />
      <div className="liquid-login-blob liquid-login-blob--violet" />
      <div className="liquid-login-blob liquid-login-blob--fuchsia" />
      <video
        className="fixed inset-0 w-full h-full object-cover -z-10"
        src="/background-video/background-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="liquid-login-card w-full max-w-[440px]">
        <div className="liquid-login-card__sheen" />
        <div className="relative px-8 pt-10 pb-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="liquid-login-chip w-12 h-12 flex items-center justify-center rounded-2xl mb-2">
              <span className="material-symbols-outlined text-white text-3xl" style={{fontVariationSettings: "\"FILL\" 1"}}>verified_user</span>
            </div>
            <h1 className="liquid-login-title text-2xl font-extrabold tracking-tighter text-white">GAP ANALISYS</h1>
            <p className="text-sm font-medium text-white/80 tracking-wide uppercase">GAP Analysis Access</p>
          </div>
        </div>
        <form onSubmit={handleSubmit(submit)} className="relative px-10 pb-10 space-y-6">
          <div className="space-y-4">
            <div className="group">
              <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-white mb-1.5 ml-1">Correo Electrónico</label>
              <div className="relative">
                <input id="email" name="email" type="email" {...register('email')} placeholder="nombre@archivo.com" className="liquid-login-input w-full px-4 py-3 text-sm" />
              </div>
            </div>
            <div className="group">
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-white ml-1">Contraseña</label>
              </div>
              <div className="relative">
                <input id="password" name="password" type="password" {...register('password')} placeholder="••••••••" className="liquid-login-input w-full px-4 py-3 text-sm" />
              </div>
            </div>
          </div>
          <button type="submit" className="liquid-login-button py-3.5 text-sm tracking-tight">Ingresar</button>
          {error && <div className="text-sm text-red-300 mt-2">{error}</div>}
        </form>
      </div>
    </main>
  )
}
