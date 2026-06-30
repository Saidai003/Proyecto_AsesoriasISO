# DT-002: Nomenclatura NC vs Brecha inconsistente en backend

**Severidad:** Baja  
**Tipo:** Claridad / Mantenibilidad  
**Archivo(s):** `backend-js/src/controllers/ncController.js`, `seeds/init.sql`, tablas `AUDITORIA_NC*`  
**Referencia:** `NOTA_BRECHAS_GAP.md`

## Problema

El frontend muestra "Brecha" y "Plan de Acción", pero el backend y la DB siguen usando "NC" (No Conformidad) en tablas, variables, y endpoints (`/api/nc/`). Esto confunde al revisar el código y al explicar la plataforma.

## Solución propuesta

Mantener así para el MVP. Un rename de tablas/endpoints es alto riesgo con poca ganancia funcional. Documentar la equivalencia: **NC = Brecha en el contexto GAP Analysis**.

Para un futuro release post-entrega, considerar:
- Renombrar endpoints: `/api/nc/` → `/api/brechas/`
- Renombrar tablas: `AUDITORIA_NC` → `BRECHAS`
- Mantener aliases en el backend durante la transición

## Estado

Aceptado (no se corrige para este entregable)
