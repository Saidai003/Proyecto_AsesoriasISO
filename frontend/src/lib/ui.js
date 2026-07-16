export function showToast(titleOrDetail, message = '', type = 'info', ttl = 5000) {
  try {
    let detail = {}
    if (titleOrDetail && typeof titleOrDetail === 'object') {
      detail = { ...titleOrDetail }
    } else {
      detail = { title: titleOrDetail || '', message: message || '', type: type || 'info', ttl: ttl || 5000 }
    }
    window.dispatchEvent(new CustomEvent('toast:show', { detail }))
  } catch (e) {
    // fallback no-op
    console.warn('showToast failed', e)
  }
}

export function notifyResponsable(requisitoId, evidenciaId) {
  try {
    window.dispatchEvent(new CustomEvent('notifications:new', { detail: { requisito_base_id: requisitoId || null, evidencia_id: evidenciaId || null } }))
  } catch (e) {
    console.warn('notifyResponsable failed', e)
  }
}

export default { showToast, notifyResponsable }
