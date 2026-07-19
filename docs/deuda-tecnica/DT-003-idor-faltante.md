# DT-003: Validacion IDOR y aislamiento por workspace

**Severidad original:** Alta  
**Tipo:** Seguridad / multi-tenancy  
**Archivo(s):** Varios controllers, `workspaceAuth.js`, pruebas unitarias e integracion

## Contexto

Esta deuda nacio porque varios endpoints usaban IDs numericos de recursos sin
garantizar siempre que el recurso perteneciera al `workspace_id` del usuario
autenticado. En un sistema multi-tenant, eso abre riesgo IDOR: un usuario podria
consultar o modificar datos de otro workspace si conoce o adivina el ID.

El patron esperado es que cada operacion sensible valide ownership contra
`EVALUACION_REQUISITO.workspace_id`, directamente o mediante una cadena de JOIN
equivalente:

- Evaluacion: `EVALUACION_REQUISITO.id -> workspace_id`
- NC/Brecha: `AUDITORIA_NC -> EVALUACION_REQUISITO -> workspace_id`
- Accion: `ACCIONES_CORRECTIVAS -> AUDITORIA_NC -> EVALUACION_REQUISITO -> workspace_id`
- Evidencia: `EVIDENCIAS -> EVALUACION_REQUISITO -> workspace_id`
- Chat contextual: `CHAT_MESSAGES` filtrado por `requisito_id` o `nc_id`, previa validacion del recurso padre

## Estado actual

La deuda original ya no representa bien la realidad del codigo. Las rutas que
antes aparecian como "pendientes" tienen validaciones implementadas o fueron
cubiertas por helpers compartidos.

Se agrego/verifico proteccion en:

- `accionesController.js`
  - `updateAction`
  - `deleteAction`
  - `getActionHistory`
  - `getAccionesByEvaluacion`
  - `createAction`
- `ncController.js`
  - `createNC`
  - `getNC`
  - `updateNC`
  - `deleteNC`
  - `listByEvaluacion`
  - `listActions`
  - `getNCHistory`
  - `getNCHistoryByEvaluacion`
- `evidenceController.js`
  - Listado, descarga, creacion, actualizacion, eliminacion e historial de evidencias con validaciones por workspace o reglas equivalentes de acceso.
- `chatController.js`
  - `getMessages`
  - `postMessage`
- `evaluationsController.js`
  - `getOrCreateEvaluacion`
  - `updateEvaluacionEstado`
  - `autoUpdateEstado`
- `workspaceAuth.js`
  - Helper compartido `verifyWorkspaceAccess(resourceId, resourceType, workspaceId)` para evaluaciones, NC y acciones.

## Evidencia automatizada

Se ha probado a nivel de tests automatizados. La cobertura principal esta en:

- `backend-js/pruebas/unitarias/multiTenancy.test.js`
  - Verifica aislamiento por workspace en evaluaciones, NC, acciones, evidencias, chat y dashboards.
  - Verifica `verifyWorkspaceAccess` para recursos propios y ajenos.
- `backend-js/pruebas/integracion/chat-ws.integration.test.js`
  - Verifica el acceso WebSocket del chat por rol y workspace.
- Tests unitarios especificos:
  - `accionesController.test.js`
  - `updateAction.equivalence.test.js`
  - `evidenceController.test.js`
  - `updateEvidence.test.js`
  - `chatController.test.js`
  - `evaluationsController.test.js`
  - `ncController.test.js`

## Pendiente real

La deuda no deberia seguir marcada como "falta validacion IDOR" en bruto. El
estado mas correcto es:

> Riesgo IDOR mitigado en codigo y cubierto por tests automatizados, pendiente
> de revision manual de pruebas y validacion exploratoria de flujos reales.

Queda pendiente revisar manualmente:

- Que los tests existentes realmente cubran los endpoints expuestos por las rutas actuales, no solo funciones internas.
- Que los casos de Admin sin `workspace_id` esten permitidos solo donde corresponde.
- Que ningun endpoint nuevo haya quedado fuera del patron de ownership.
- Que los codigos de respuesta sean consistentes (`403` para acceso prohibido, `404` cuando se quiera ocultar existencia del recurso).
- Que el chat por WebSocket mantenga la validacion de sala por workspace en escenarios reales de navegador.
- Que evidencias mantenga el aislamiento tambien en operaciones con Google Drive, historial y archivos eliminados.

## Estado

**Mitigada / pendiente de revision manual.**

No se recomienda cerrar completamente esta deuda hasta ejecutar y revisar
manualmente los flujos multi-tenant principales con usuarios de distintos
workspaces. Si esa revision no encuentra fugas, esta DT puede moverse a
"resuelta" o archivarse como deuda cerrada.
