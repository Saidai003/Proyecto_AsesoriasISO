---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Deuda Técnica Documentada

## Registro formal: 7 items identificados

| ID | Severidad | Tipo | Resumen |
|----|-----------|------|---------|
| DT-001 | Media | Mantenibilidad | Componente de 1200+ líneas |
| DT-002 | Baja | Claridad | Nomenclatura NC vs Brecha |
| DT-003 | **Alta** | Seguridad | IDOR faltante en endpoints |
| DT-004 | Baja | Limpieza | Console.logs en producción |
| DT-005 | Media | Calidad | Tests faltantes para controllers |
| DT-007 | Baja | Mantenibilidad | Historial duplicado en acciones |
| DT-008 | Media | Validación | Acciones vacías permitidas |

---

# Lecciones Aprendidas — Trabajo con IA

## De "vibe coding" a "vibe engineering"

**Problema:** se priorizó velocidad sobre revisión → deuda técnica acumulada

**Solución adoptada:**
1. Diseñar y segmentar tareas (<50 líneas de código por tarea)
2. Revisar inmediatamente cada resultado de IA
3. Intercalar tareas de auditoría cada 3-5 tareas funcionales

**Reflexión:** La IA no reemplaza al ingeniero. Reemplaza la escritura manual de código. El ingeniero sigue siendo responsable del diseño, la revisión y la validación.
