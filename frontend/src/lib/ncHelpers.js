// Shared helper functions for NC views and components
export function statusColor(status){
  switch(status){
    case 'Pendiente': return 'bg-yellow-100 text-yellow-800'
    case 'En_Progreso': return 'bg-blue-600 text-white'
    case 'Eficaz': return 'bg-emerald-100 text-emerald-800'
    case 'No_Eficaz': return 'bg-orange-100 text-orange-800'
    default: return 'bg-slate-100 text-slate-800'
  }
}

export function shadeColor(hex, percent) {
  const normalized = hex.replace('#','')
  const num = parseInt(normalized,16)
  let r = (num >> 16) & 0xFF
  let g = (num >> 8) & 0xFF
  let b = num & 0xFF
  const amt = Math.round(255 * (percent/100))
  r = Math.max(0, Math.min(255, r + amt))
  g = Math.max(0, Math.min(255, g + amt))
  b = Math.max(0, Math.min(255, b + amt))
  return `#${((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)}`
}

export function validationColor(val){
  switch(val){
    case 'Acepto': return 'bg-green-600'
    case 'Parcial': return 'bg-yellow-500'
    case 'No Acepto': return 'bg-red-600'
    default: return 'bg-slate-400'
  }
}

export function flowColor(val){
  switch(val){
    case 'Abierta': return 'bg-red-500'
    case 'Análisis': return 'bg-orange-500'
    case 'Ejecución': return 'bg-blue-600'
    case 'Verificación': return 'bg-emerald-600'
    case 'Cerrada': return 'bg-slate-600'
    default: return 'bg-slate-400'
  }
}

export default { statusColor, shadeColor, validationColor, flowColor }
