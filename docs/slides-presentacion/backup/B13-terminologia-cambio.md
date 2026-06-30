---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Cambio Terminológico: NC → Brecha

## ¿Por qué el cambio?

- "No Conformidad" es término ISO formal, correcto para auditorías de certificación
- "Brecha" es más intuitivo para clientes sin experiencia ISO
- GAP Análisis habla de "brechas" naturalmente (gaps)
- La contraparte validó que los clientes entienden mejor "brecha" que "NC"

---

# Alcance del Cambio

## Solo frontend (presentación)

| Elemento | Antes | Después |
|----------|-------|---------|
| Listado en requisito | "No conformidades" | "Brechas Detectadas en GAP Analysis" |
| Botón de creación | "Crear NC" | "Registrar Brecha de Cumplimiento" |
| Vista de detalle | "No Conformidad #n" | "Brecha #n" |
| Kanban | "Acciones Correctivas" | "Plan de Implementación" |
| Estado "Eficaz" | "Eficaz" | "Implementada / Cumplida" |
| Estado "No_Eficaz" | "No eficaz" | "Requiere Ajuste" |

## Backend + DB: sin cambios
- Tablas siguen llamándose `AUDITORIA_NC`, `AUDITORIA_NC_HIST`
- Documentado como DT-002 (deuda técnica aceptada, severidad Baja)

---

# ¿Es deuda técnica o decisión consciente?

## DT-002: Nomenclatura NC vs Brecha

**Estado:** Aceptado (no se corrige)

**Razón:** renombrar las tablas, columnas, endpoints y tests implicaría:
- ALTER TABLE en 5+ tablas
- Renombrar 3 controllers y sus rutas
- Actualizar todos los tests
- Riesgo de regresión alto

**Mitigación:** el frontend es la capa de presentación; el backend usa el término técnico correcto. La documentación aclara la dualidad.
