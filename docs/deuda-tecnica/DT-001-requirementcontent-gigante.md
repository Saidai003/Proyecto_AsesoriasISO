# DT-001: RequirementContent.jsx gigante

**Severidad:** Media  
**Tipo:** Mantenibilidad  
**Archivo(s):** `frontend/src/pages/RequirementContent.jsx` (+1200 líneas)  
**Plan existente:** `frontend/src/pages/requirement/README.md` (REFACTOR-001)

## Problema

Un solo componente maneja evidencias, brechas, historial, modales, notificaciones, filtros, y estados de cumplimiento. Imposible de revisar, testear, o modificar sin riesgo de romper otra cosa.

~60 variables de estado (`useState`) en un solo componente. Cada cambio requiere leer el archivo entero para entender efectos colaterales.

## Solución propuesta

Dividir en componentes más pequeños según responsabilidad:
- `EvidenceSection` — carga, listado, filtro, preview, descarga de evidencias
- `NCSection` — tabla de brechas, filtros, creación
- `HistoryModal` — historial de evidencias
- `NCHistoryModal` — historial de brechas
- `RequirementStatusBadge` — cálculo y display del estado de cumplimiento

Ver plan detallado en `frontend/src/pages/requirement/README.md`.

## Estado

Pendiente
