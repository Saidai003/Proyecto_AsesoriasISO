# DT-008: No se valida que acciones correctivas no queden vacías

**Severidad:** Media  
**Tipo:** Calidad / Validación  
**Archivo(s):** `backend-js/src/controllers/ncController.js` (función `createAction`), `frontend/src/components/ActionKanbanBoard.jsx`  
**Criterio:** RF-AC-01-CA-007

## Problema

Se puede crear una acción correctiva con el campo `accion` (título) vacío. No hay validación ni en frontend ni en backend.

- Backend: `const accion = payload.accion || ''` → inserta string vacío sin error
- Frontend: el formulario de crear acción no impide enviar si el campo está vacío

## Solución propuesta

**Backend** — agregar validación en `createAction`:
```js
if (!payload.accion || !String(payload.accion).trim()) {
  return res.status(400).json({ error: 'accion_required' })
}
```

**Frontend** — deshabilitar botón "Crear" si el campo acción está vacío, o mostrar toast de advertencia.

## Estado

Completado (30/06/2026) — Validación backend agregada en `createAction` de `ncController.js`.
