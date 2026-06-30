---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Escalabilidad — Plan Técnico

## Corto plazo (sin cambios de arquitectura)

- El backend REST puede ponerse detrás de un load balancer
- MySQL soporta miles de workspaces con indexación adecuada
- Google Drive: migrable a S3 cambiando solo driveService
- WebSocket: broadcast simple funciona para decenas de usuarios

## Cuándo escalar

| Señal | Acción |
|-------|--------|
| >100 usuarios concurrentes en WS | Redis pub/sub para WS clustering |
| >50 GB en evidencias | Migrar a S3 |
| >500 workspaces | Evaluar sharding o read replicas |
| Múltiples developers | Agregar TypeScript + migraciones |

---

# Producto Completo Proyectado

## Visión post-MVP

```
MVP actual (ISO 9001)
    │
    ├── Multi-norma (ISO 27001, 14001, 45001)
    ├── IA Agente (opera sobre datos, no solo conversa)
    ├── Importación inteligente de documentos
    ├── Reutilización entre módulos (sin duplicidad)
    ├── Historial auditable completo
    └── SaaS comercializable
```

## Diferenciador clave
No es solo reemplazar Excel ni copiar ISWO. Es una plataforma:
- **Simple** para clientes sin experiencia ISO
- **Auditable** cláusula por cláusula
- **Inteligente** (roadmap hacia IA agente)
- **Adaptada** al flujo específico de la consultora

---

# ¿Cómo se agregaría otra norma ISO?

## Diseño preparado para multi-norma

```sql
ISOS (id=1 "ISO 9001:2015", id=2 "ISO 27001:2022")
  └── CLAUSULAS (iso_id → distingue la norma)
        └── REQUISITOS_BASE (autorreferencia igual)
```

1. Escribir un nuevo script de seed (ej: `seedISO27001.sql`)
2. Seguir el mismo patrón de cláusulas → requisitos → subrequisitos
3. El frontend ya renderiza cualquier árbol ISO dinámicamente
4. Los dashboards calculan por workspace (agnóstico a la norma)

**Esfuerzo estimado:** ~1 semana por norma nueva (principalmente redacción del seed).
