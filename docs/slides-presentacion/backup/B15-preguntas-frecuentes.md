---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Preguntas Anticipadas

## "¿Por qué JavaScript y no TypeScript?"

- TypeScript agrega type-safety pero también boilerplate y tiempo de setup
- Para un MVP de 210 horas con 1 desarrollador, JS permite prototipar más rápido
- Mitigado con: tests unitarios, validaciones explícitas, revisiones con IA
- **Riesgo aceptado y documentado en ADR-002**
- Para producción futura: TypeScript es el siguiente paso natural

---

# "¿Qué pasa si la base de datos crece mucho?"

## Escalabilidad del esquema actual

| Volumen | Problema | Solución |
|---------|----------|----------|
| <100 workspaces | Ninguno | Esquema actual |
| 100-500 workspaces | Queries lentas en JOINs | Índices compuestos |
| 500-2000 workspaces | Contención en escritura | Read replicas |
| >2000 workspaces | Límite de schema compartido | Sharding por workspace_id |

El diseño actual tiene índices en: `workspace_id`, `evaluacion_requisito_id`, `nc_id`.

---

# "¿Cómo se garantiza la integridad de los datos?"

## Mecanismos implementados

1. **FK constraints:** CASCADE/SET NULL según relación
2. **UNIQUE constraints:** email, evaluacion+workspace
3. **ENUMs:** estados válidos definidos en schema
4. **Validaciones en controller:** verificar antes de INSERT/UPDATE
5. **Transaccionalidad:** MySQL InnoDB → ACID
6. **Historial:** tablas `_HIST` para auditar cambios
7. **Idempotencia:** seeds verifican antes de insertar

---

# "¿El sistema cumple con la norma ISO 9001?"

## Aclaración importante

El sistema **no necesita** estar certificado ISO 9001 él mismo.

El sistema es una **herramienta** para que las organizaciones clientes gestionen su propio cumplimiento de ISO 9001.

Lo que el sistema sí implementa:
- Trazabilidad de cambios (quién, cuándo, qué)
- Control documental (evidencias con historial)
- Gestión de No Conformidades (con ciclo de vida completo)
- Mejora continua (acciones correctivas con seguimiento)

Estos son requisitos que ISO 9001 exige a las organizaciones, y la plataforma los facilita.
