import React from 'react'
import { useAuth } from '../AuthContext'
import { useForm } from 'react-hook-form'

export default function Login({ onLogin }) {
  const [error, setError] = React.useState(null)
  const { login } = useAuth() || {}
  const { register, handleSubmit } = useForm({ defaultValues: { email: '', password: '' } })

  const submit = async (data) => {
    setError(null)
    try{
      await login({ email: data.email, password: data.password })
      if(onLogin) onLogin()
    }catch(err){
      setError(err.error || 'Login failed')
    }
  }

  return (
    <main className="h-full bg-surface text-on-surface antialiased flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="bg-surface-container-lowest rounded-xl shadow overflow-hidden">
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-primary-fixed rounded-xl mb-2">
                <span className="material-symbols-outlined text-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tighter text-primary">Sovereign QMS</h1>
              <p className="text-sm font-medium text-on-secondary-container tracking-wide uppercase">Sovereign Archive Access</p>
            </div>
          </div>
          <form onSubmit={handleSubmit(submit)} className="px-10 pb-10 space-y-6">
            <div className="space-y-4">
              <div className="group">
                <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-1.5 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <input id="email" name="email" type="email" {...register('email')} placeholder="nombre@archivo.com" className="w-full px-4 py-3 bg-surface-container-high text-on-surface border-0 rounded-lg placeholder:text-outline/50 text-sm" />
                </div>
              </div>
              <div className="group">
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="password" className="block text-[10px] font-bold uppercase tracking-widest text-outline ml-1">Contraseña</label>
                </div>
                <div className="relative">
                  <input id="password" name="password" type="password" {...register('password')} placeholder="••••••••" className="w-full px-4 py-3 bg-surface-container-high text-on-surface border-0 rounded-lg placeholder:text-outline/50 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <a className="text-xs font-semibold text-on-primary-fixed-variant hover:text-primary" href="#">¿Olvidé mi contraseña?</a>
            </div>
            <button type="submit" className="w-full primary-gradient text-on-primary font-bold py-3.5 rounded-xl shadow-md text-sm tracking-tight">Ingresar</button>
            {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
            <div className="relative py-2 flex items-center">
              <div className="flex-grow border-t border-outline-variant/30"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold uppercase tracking-widest text-outline">O continuar con</span>
              <div className="flex-grow border-t border-outline-variant/30"></div>
            </div>
            <button type="button" className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-surface border border-outline-variant/40 rounded-xl"> 
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path></svg>
              <span className="text-sm font-semibold text-on-surface-variant">Iniciar con Google</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
