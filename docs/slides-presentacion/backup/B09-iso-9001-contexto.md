---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# ISO 9001:2015 — Contexto Normativo

## Estructura de la norma

- **Cláusula 4:** Contexto de la organización
- **Cláusula 5:** Liderazgo
- **Cláusula 6:** Planificación
- **Cláusula 7:** Apoyo
- **Cláusula 8:** Operación
- **Cláusula 9:** Evaluación del desempeño
- **Cláusula 10:** Mejora

Las cláusulas 4-10 son auditables (1-3 son introductorias).

---

# ¿Qué es un GAP Análisis?

## Diagnóstico comparativo

```
Estado actual de la organización
         vs.
Requisitos de ISO 9001:2015
         =
Brechas identificadas + Plan de acción
```

- Cada requisito se evalúa: **Cumple | Parcial | No cumple | NA**
- Las brechas se documentan como No Conformidades
- Cada NC tiene acciones correctivas asociadas
- El cierre de brechas acerca a la organización a la certificación

---

# Requisito 4.3 — Exclusiones (NA)

## ¿Por qué el sistema permite marcar "No Aplica"?

ISO 9001:2015, Cláusula 4.3 establece que una organización puede **excluir requisitos** si:
- No aplican a sus productos/servicios
- No afectan su capacidad para asegurar conformidad

## Implementación en el sistema

```javascript
// Dashboard: excluir NA del cálculo
const evaluacionesAplicables = evaluaciones.filter(e => e.estado !== 'NA')
const porcentaje = (cumple + parcial * 0.5) / totalAplicables * 100
```

Solo el Evaluador puede marcar NA (decisión auditable con historial).
