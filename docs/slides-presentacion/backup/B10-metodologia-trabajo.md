---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Metodología de Trabajo

## Evolución durante el proyecto

| Período | Metodología | Razón del cambio |
|---------|------------|------------------|
| Inicio → 6 mayo | Ágil + Carta Gantt | Rigidez excesiva para MVP |
| 6 mayo → fin mayo | Kanban puro | Flujo flexible, priorización dinámica |
| Fin mayo → actual | Kanban + Jira | Profesionalizar seguimiento |

---

# ¿Por qué se abandonó la Carta Gantt?

- El MVP requiere adaptarse rápidamente a descubrimientos técnicos
- Reprogramar tareas en Gantt consumía tiempo sin agregar valor
- Kanban permite visualizar WIP (work in progress) y cuellos de botella
- El equipo es de 1 persona: la ceremonia de Gantt no se justifica

## Jira
- Adoptado para aprender la herramienta profesional
- Centralizar incidencias
- Mantener trazabilidad de bugs y features
- La planilla se mantiene como backup documental

---

# Gestión del Alcance

## Ajustes de alcance durante el desarrollo

| Funcionalidad | Decisión |
|--------------|----------|
| Chat como JSON/CRUD | ❌ → Se implementó WebSocket (mejor UX) |
| Evidencias en MySQL | ❌ → Se migró a Google Drive |
| Acciones planas | ❌ → Se implementó linked-list + Kanban |
| Dashboard "básico" | Se amplió a radar + KPIs por cláusula |
| Correo transaccional | ✅ Mantiene excluido |
| Multi-norma | ✅ Mantiene excluido |
| Carga CSV | ✅ Mantiene excluido |

Las ampliaciones se justifican por: valor para la contraparte + viabilidad técnica demostrada.
