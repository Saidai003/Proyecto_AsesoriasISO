/**
 * Utilidades generales para el backend.
 */

/**
 * Elimina acentos (diacríticos) de un string usando descomposición NFD.
 * Ej: "Análisis" → "Analisis", "Ejecución" → "Ejecucion"
 * @param {string} s
 * @returns {string}
 */
function stripAccents(s) {
  if (typeof s !== 'string') return s
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function formatUtcDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

module.exports = { stripAccents, formatUtcDateTime }
