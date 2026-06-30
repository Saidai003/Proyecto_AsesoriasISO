---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Multi-Tenancy — Estrategia

## Enfoque: Shared Database, Shared Schema

- Una sola base de datos para todos los workspaces
- Segregación por `workspace_id` en queries (no por schema ni DB separada)
- Más simple que multi-DB, suficiente para el volumen esperado

## ¿Por qué no DB separada por cliente?
- Complejidad operativa (backups, migraciones, connections)
- Overhead para un MVP con pocos clientes iniciales
- El patrón JOIN + workspace_id es suficiente y auditable

---

# Multi-Tenancy — Patrón de Protección

## Ejemplo real del código

```javascript
// accionesController.js - updateAction
const [rows] = await pool.execute(
  `SELECT ac.* FROM ACCIONES_CORRECTIVAS ac
   JOIN AUDITORIA_NC anc ON ac.auditoria_nc_id = anc.id
   JOIN EVALUACION_REQUISITO er ON anc.evaluacion_requisito_id = er.id
   WHERE ac.id = ? AND er.workspace_id = ?`,
  [id, workspaceId]
)
if (!rows || rows.length === 0) 
  return res.status(404).json({ error: 'not_found' })
```

El JOIN hasta `EVALUACION_REQUISITO.workspace_id` garantiza que solo se accede a datos propios.

---

# Multi-Tenancy — Estado de Auditoría (DT-003)

## Endpoints ya protegidos ✅
- updateAction, deleteAction (accionesController)
- updateNC, deleteNC, getNC, listByEvaluacion (ncController)
- getNCHistory, getNCHistoryByEvaluacion (ncController)

## Pendientes de auditar ⚠️
- getActionHistory — no filtra por workspace
- getAccionesByEvaluacion — sin validación
- Endpoints de evidencias
- Endpoints de chat
- Endpoints de evaluaciones

**Impacto:** documentado como severidad ALTA. Plan: auditar y corregir antes de producción.
