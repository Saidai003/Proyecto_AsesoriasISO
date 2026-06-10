import React from 'react'
import { useForm } from 'react-hook-form'

export default function ActivateAccount() {
  const { register, handleSubmit } = useForm()

  const onSubmit = (data) => {
    console.log('activate account', data)
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface text-on-surface">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-on-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>security</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tighter text-primary">Sovereign QMS</span>
          </div>
          <h1 className="text-3xl font-extrabold text-on-surface">Configurar tu cuenta</h1>
          <p className="text-on-surface-variant max-w-sm">Estás a un paso de acceder a la arquitectura de cumplimiento ISO 9001:2015.</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-8 shadow relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-label-md font-semibold uppercase tracking-widest text-on-secondary-container">Nueva Contraseña</label>
                <span className="material-symbols-outlined text-outline text-lg">lock</span>
              </div>
              <input id="password" name="password" type="password" placeholder="••••••••••••" {...register('password')} className="w-full px-4 py-4 bg-surface-container-high rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="confirm_password" className="text-label-md font-semibold uppercase tracking-widest text-on-secondary-container">Confirmar Contraseña</label>
                <span className="material-symbols-outlined text-outline text-lg">verified_user</span>
              </div>
              <input id="confirm_password" name="confirm_password" type="password" placeholder="••••••••••••" {...register('confirm_password')} className="w-full px-4 py-4 bg-surface-container-high rounded-lg" />
            </div>
            <div className="bg-surface-container-low p-6 rounded-lg space-y-4">
              <h3 className="text-label-md font-bold text-on-surface-variant uppercase tracking-widest">Protocolos de seguridad</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>Mínimo 12 caracteres</div>
                <div className="flex items-center gap-3 text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>Letras mayúsculas</div>
                <div className="flex items-center gap-3 text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>Números y símbolos</div>
                <div className="flex items-center gap-3 text-body-sm text-on-surface-variant"><span className="material-symbols-outlined text-outline-variant">radio_button_unchecked</span>Sin información personal</div>
              </div>
            </div>
            <button type="submit" className="w-full py-4 px-6 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-xl">Activar Cuenta</button>
          </form>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-outline text-xs font-medium uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">encrypted</span>Cifrado AES-256</div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">workspace_premium</span>ISO 9001:2015 Architecture</div>
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">gpp_good</span>Sovereign Protocol</div>
        </div>
      </div>
    </main>
  )
}
