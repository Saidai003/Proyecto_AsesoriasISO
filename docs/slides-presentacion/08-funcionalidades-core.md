---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Funcionalidades Implementadas — Core

## Autenticación y Seguridad
- JWT (30 min) + Refresh Token en DB (24h, cookie HttpOnly)
- Activación de cuenta en primer ingreso
- Timeout por inactividad (react-idle-timer)
- RBAC con middleware encadenado

## Administración
- CRUD de espacios de trabajo
- CRUD de usuarios con asignación de rol y workspace
- 3 roles: Administrador, Evaluador, Responsable SGC

---

# Funcionalidades — Motor GAP

## Árbol Normativo ISO 9001:2015
- Cargado por seeding (script SQL idempotente)
- Estructura: ISO → Cláusulas (4-10) → Requisitos → Subrequisitos
- Autorreferencia con FK `requisito_padre_id`
- Árbol construido en memoria (2 pasadas)

## Evaluación de Cumplimiento
- Estados: Cumple | Parcial | No cumple | NA
- NA excluye del cálculo (ISO 9001 Req 4.3)
- Historial de cambios por evaluación

---

# Funcionalidades — No Conformidades (Brechas)

## Máquina de estados (estado_flujo)

```
Abierta → Análisis → Ejecución → Verificación → Cerrada
```

- Responsable SGC: mueve a Análisis o Ejecución
- Evaluador: mueve a Verificación (requiere fecha futura) o Cerrada
- Verificación programa notificación automática

## Estado de validación (paralelo)
- Acepto | Parcial | No Acepto (lo cambia el Responsable)
- Independiente del flujo — es el "visto bueno" sobre la brecha

---

# Funcionalidades — Acciones Correctivas

## Tablero Kanban (drag-and-drop)

| Pendiente | En Progreso | Implementada | Requiere Ajuste |
|-----------|-------------|--------------|-----------------|
| Nuevas acciones | En ejecución | Eficaz/Cumplida | Necesita corrección |

- **Linked-list:** cada acción puede tener hijas (`accion_previa_id`)
- Historial campo por campo en `ACCIONES_CORRECTIVAS_HIST`
- Eliminación en cascada (hijos antes que padres)
- Notificaciones a responsables en cada cambio de estado
