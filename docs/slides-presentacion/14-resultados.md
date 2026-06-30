---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Resultados

## Cumplimiento de Objetivos Específicos

| # | Objetivo | Estado |
|---|----------|--------|
| 1 | Arquitectura, roles, multi-tenancy | ✅ SRS + ADR + C4 |
| 2 | Auth, usuarios, workspaces | ✅ Implementado |
| 3 | Seeding ISO 9001:2015 | ✅ Script idempotente |
| 4 | Motor GAP + NC + Acciones + KPIs | ✅ Dashboard + Kanban |
| 5 | Evidencias con revisión e historial | ✅ Google Drive + logs |
| 6 | Pruebas unitarias/integración/multi-tenancy/UAT | 🔄 Parcial (unit+integ ✅, MT/UAT pendiente) |

---

# Avance Cuantitativo

<!-- Actualizar estos números con la hoja de seguimiento actual -->

- **Módulos completados:** Auth, Usuarios, Workspaces, ISO Tree, NC, Acciones Correctivas, Evidencias, Chat, Notificaciones, Dashboard, Kanban, Evaluaciones
- **Módulos pendientes:** Correcciones IDOR restantes, pruebas multi-tenancy formales, UAT, cierre documental

## Validación con contraparte
- María (consultora ISO): "El MVP ya resulta útil porque guarda los datos, organiza los componentes necesarios y permite comenzar a operar"
- Ricardo (CEO): Aprobación de sistema de evidencias como repositorio

---

# Comparación con Estado del Arte

| Característica | Excel/Drive | ISWO/GRCTools | **Este MVP** |
|---------------|-------------|---------------|-------------|
| Trazabilidad | ❌ | ✅ | ✅ |
| Multi-tenancy | ❌ | ✅ | ✅ |
| Simplicidad UX | ✅ | ❌ | ✅ |
| Radar cumplimiento | ❌ | ✅ | ✅ |
| Adaptado al flujo propio | ❌ | ❌ | ✅ |
| Costo | Gratis | $$$/ mes | Propio |
| Chat contextual | ❌ | Parcial | ✅ |
