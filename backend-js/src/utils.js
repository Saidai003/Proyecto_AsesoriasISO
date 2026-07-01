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

module.exports = { stripAccents }
