---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Base de Datos — ¿Por qué MySQL sin ORM?

## Justificación

- Queries específicas: JOINs de 3-4 tablas para IDOR
- Autorreferencia en requisitos (árbol ISO)
- INSERT...SELECT para seeds
- Auditable línea por línea (la comisión puede preguntar "¿qué hace este endpoint?")
- Debug directo: copiar query → MySQL Workbench → probar

## Riesgos aceptados
- Sin TypeScript → mitigado con tests y validaciones explícitas
- Sin migraciones automáticas → esquema estable tras fase de diseño

---

# ¿Por qué no PostgreSQL?

- MySQL es suficiente para el dominio
- El equipo tiene más experiencia con MySQL
- La empresa ya cuenta con servidor MySQL propio
- Docker Hub tiene imagen oficial bien mantenida

## ¿Qué ofrece PostgreSQL que no se usa aquí?
- CTE recursivas (el árbol se construye en JS por ser ~80 nodos)
- JSON nativo (se usa JSON en CHAT_MESSAGES.metadata, MySQL 8 lo soporta)
- Extensiones avanzadas (no requeridas)

---

# Árbol Normativo — Autorreferencia

```sql
REQUISITOS_BASE (
    id INT PRIMARY KEY,
    clausula_id INT,
    requisito_padre_id INT → SELF REFERENCE,
    descripcion_normativa TEXT
)
```

## ¿Por qué no Nested Sets o Materialized Path?

| Patrón | Ventaja | Problema para este caso |
|--------|---------|------------------------|
| Nested Sets | Subárboles en O(1) | Recalcular left/right en cada INSERT; la norma es estática |
| Materialized Path | LIKE '4.1%' | Frágil ante cambios de numeración |
| **Autorreferencia** | Simple, estándar, profundidad ilimitada | Requiere 2 pasadas en memoria (instantáneo para 80 nodos) |
