# Plan: Persistencia automática del estado de requisito

## Problema
`estado_cumplimiento` en DB solo cambia con el toggle manual NA. El frontend calcula un estado visual (`useMemo` en `RequirementContent.jsx`) que no se persiste, generando inconsistencia con el dashboard.

## Aclaración previa
No existe `RequirementContext.jsx`. La lógica de criterios de estado está en `frontend/src/pages/RequirementContent.jsx` líneas 577-611.

---

## Decisión 1: Mapeo frontend → DB

| Estado visual (frontend) | Estado DB (`estado_cumplimiento`) | Justificación |
|--------------------------|-----------------------------------|---------------|
| `No Aplica` | `NA` | Toggle manual |
| `Cumple` | `Cumple` | Directo |
| `No Cumple` | `No cumple` | Directo |
| `En Revisión` | `Parcial` | Cumplimiento parcial / bajo revisión |
| `No Evaluado` | `No cumple` | Sin datos pero explícitamente no excluido del alcance |

---

## Decisión 2: Backend — nuevo endpoint

**Ruta**: `POST /api/evaluaciones/:id/auto-estado`  
**Controlador**: `backend-js/src/controllers/evaluationsController.js` → `autoUpdateEstado(req, res)`  
**Protección**: `requireAuth` + `requireRoles('Evaluador')` (igual que `PATCH /:id`)

### Lógica de `autoUpdateEstado`
1. Obtener `evaluacion` por `id` + `workspace_id`. Si no existe, 404.
2. Si `estado_cumplimiento === 'NA'`, retornar `{ ok: true, estado_cumplimiento: 'NA', changed: false }` sin modificar.
3. Consultar evidencias de la evaluacion: `SELECT estado_validacion_archivo FROM EVIDENCIAS WHERE evaluacion_requisito_id = ?`
4. Consultar NCs de la evaluacion: `SELECT estado_flujo FROM AUDITORIA_NC WHERE evaluacion_requisito_id = ?`
5. Aplicar mapeo de Decisión 1.
6. Si el estado calculado difiere del actual:
   - `UPDATE EVALUACION_REQUISITO SET estado_cumplimiento = ?, ultima_edicion_por = ?, fecha_ultima_edicion = NOW() WHERE id = ?`
   - Insertar snapshot en `EVALUACION_REQUISITO_HIST` con `accion = 'Estado auto-calculado: <valor>'`
7. Retornar `{ ok: true, estado_cumplimiento, changed }`.

---

## Decisión 3: Frontend — llamadas después de mutaciones

Mantener `useMemo` existente en `RequirementContent.jsx` (línea 577) para feedback visual inmediato.

Agregar función helper:
```javascript
const syncRequirementStatus = async (evaluacionId) => {
  if (!evaluacionId) return
  try {
    const res = await fetchWithAuth(`/api/evaluaciones/${evaluacionId}/auto-estado`, { method: 'POST' })
    if (res.ok) { /* opcional: usar respuesta para reconciliar UI */ }
  } catch (e) { console.error('sync requirement status error', e) }
}
```

### Puntos de llamada en `RequirementContent.jsx`

| Mutación | Ubicación | Momento de llamada |
|----------|-----------|-------------------|
| Cambio de aprobación de evidencia | `updateEvidenceStatus` (línea ~657) | Después de `setEvidences(...)` |
| Reemplazo de archivo de evidencia | `onUpdateFileChosen` éxito (línea ~242) | Después de `setEvidences(...)` |
| Eliminación de evidencia | callback de confirm (línea ~857) | Después de `setEvidences(...)` |
| Toggle NA (quitar NA) | `toggleNA` éxito (línea ~632) | Solo cuando `newEstado !== 'NA'` |
| NC creada | handler `nc:created` (línea ~159) | Después de `loadNCs()` |
| NC eliminada | callback delete (línea ~1047) | Después de `setNcList(...)` |

### Punto de llamada en `RequirementView.jsx`

| Mutación | Ubicación | Momento de llamada |
|----------|-----------|-------------------|
| NC creada | `createNc` éxito (línea ~119) | Después de `setNcModalOpen(false)`, si `evaluacionId` disponible |

> Nota: Los cambios de flujo de NC se realizan en `NCView.jsx`. Al navegar de vuelta, `RequirementContent` se remonta y recarga. Si se requiere sync inmediato sin navegación, puede agregarse un evento custom `nc:updated` en el futuro (fuera de este plan).

---

## Archivos afectados

### Backend
- `backend-js/src/controllers/evaluationsController.js` — agregar `autoUpdateEstado`
- `backend-js/src/routes/evaluaciones.js` — agregar `router.post('/:id/auto-estado', ...)`

### Frontend
- `frontend/src/pages/RequirementContent.jsx` — agregar `syncRequirementStatus` y llamadas post-mutación
- `frontend/src/pages/RequirementView.jsx` — llamar `syncRequirementStatus` después de crear NC

---

## Validación

1. **Caso NA**: Crear requisito → DB `NA` → frontend `No Aplica` → no debe cambiar al auto-estado.
2. **Caso Cumple**: Remover NA → subir evidencia → aprobar evidencia → DB debe pasar a `Cumple`.
3. **Caso No Cumple**: Remover NA → crear NC abierta → DB debe pasar a `No cumple`.
4. **Caso Parcial**: Remover NA → subir evidencia pendiente (sin rechazos, sin NCs) → DB debe pasar a `Parcial`.
5. **Caso No Evaluado**: Remover NA → sin evidencias ni NCs → DB debe quedar en `No cumple`.
6. **Dashboard**: Verificar que el porcentaje de cumplimiento incluya el requisito una vez que `estado_cumplimiento` sea `Cumple`/`Parcial`/`No cumple` y lo excluya cuando sea `NA`.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Race condition: dos mutaciones simultáneas | Last-write-wins es aceptable; el estado es determinista por evidencias/NCs |
| Frontend y DB divergen temporalmente | `useMemo` provee feedback inmediato; el POST al backend reconcilia en ~100ms |
| NC actualizada en `NCView.jsx` no dispara sync | Se mitiga al navegar de vuelta; para sync inmediato puede agregarse evento custom en fase 2 |
| `No Evaluado` mapeado a `No cumple` puede ser confuso | Es consistente con el comportamiento actual cuando se desactiva NA; el frontend seguirá mostrando el badge visual `No Evaluado` |
