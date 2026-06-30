---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Modelo de Datos — Pivot Central

```
REQUISITOS_BASE (la norma ISO, compartida)
        │
        │  1 requisito → 1 evaluación POR WORKSPACE
        ▼
EVALUACION_REQUISITO (pivot central)
        │
        ├── EVIDENCIAS (archivos en Google Drive)
        ├── AUDITORIA_NC (brechas detectadas)
        │       ├── ACCIONES_CORRECTIVAS (linked-list)
        │       ├── NC_HIST (historial de estados)
        │       └── CHAT_MESSAGES
        └── EVALUACION_REQUISITO_HIST
```

**EVALUACION_REQUISITO** es la tabla pivot: todo lo per-workspace cuelga de aquí.

---

# Aislamiento Multi-Tenancy

Todas las queries validan workspace mediante JOIN:

```sql
SELECT a.* FROM AUDITORIA_NC a
JOIN EVALUACION_REQUISITO er ON a.evaluacion_requisito_id = er.id
WHERE er.id = ? AND er.workspace_id = ?
```

- Previene IDOR (Insecure Direct Object Reference)
- Un usuario de workspace A **no puede** ver datos de workspace B
- Patrón aplicado en: NC, Acciones, Evidencias, Chat

---

# Esquema — 28+ tablas organizadas en 7 niveles

| Nivel | Tablas |
|-------|--------|
| Base | ISOS, ROLES, ESPACIO_TRABAJO |
| Nivel 1 | CLAUSULAS, USUARIOS |
| Nivel 2 | REQUISITOS_BASE, SESSIONS, NOTIFICACIONES |
| Nivel 3 | EVALUACION_REQUISITO, PROCESOS |
| Nivel 4 | EVIDENCIAS, AUDITORIA_NC |
| Nivel 5 | ACCIONES_CORRECTIVAS, CHAT_MESSAGES, NC_HIST |
| Nivel 6 | ACCIONES_CORRECTIVAS_HIST |
