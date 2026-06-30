# DT-003: Falta validación IDOR en algunos endpoints

**Severidad:** Alta  
**Tipo:** Seguridad  
**Archivo(s):** Varios controllers

## Problema

Algunos endpoints no validan que el recurso pertenezca al workspace del usuario autenticado. Un usuario podría acceder a datos de otro workspace si conoce el ID numérico del recurso.

El patrón correcto es hacer JOIN hasta `EVALUACION_REQUISITO.workspace_id` y comparar con `req.user.workspace_id`.

## Correcciones aplicadas

- ✅ `updateAction` en `accionesController.js` — corregido 29/06/2026
- ✅ `deleteAction` en `accionesController.js` — ya tenía validación
- ✅ `updateNC`, `deleteNC`, `getNC`, `listByEvaluacion`, `getNCHistory`, `getNCHistoryByEvaluacion` en `ncController.js` — ya tenían validación

## Pendientes de auditar

- [ ] `getActionHistory` — no filtra por workspace
- [ ] `getAccionesByEvaluacion` — sin validación de workspace
- [ ] Endpoints de evidencias (`evidenceController.js`)
- [ ] Endpoints de chat (`chatController.js`)
- [ ] Endpoints de evaluaciones (`evaluationsController.js`)

## Estado

En progreso
