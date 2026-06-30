# DT-005: Falta de tests unitarios en controllers críticos

**Severidad:** Media  
**Tipo:** Calidad / Confianza  
**Archivo(s):** `backend-js/pruebas/unitarias/`

## Problema

Existen tests para algunos controllers pero no cubren todos los flujos críticos. Los tests existentes pueden estar desactualizados tras cambios hechos durante vibe coding sin actualizar las pruebas correspondientes.

## Solución propuesta

Priorizar tests para flujos críticos:
1. Auth (login, refresh, logout)
2. CRUD workspaces (crear, eliminar con cascading)
3. CRUD usuarios (crear, asignar rol/workspace)
4. updateNC (validaciones de estado, IDOR, historial)
5. updateAction (IDOR, estados permitidos)

## Estado

Pendiente
