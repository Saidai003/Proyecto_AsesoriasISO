---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Acciones Correctivas — Modelo Detallado

## Linked List (hilo padre-hijo)

```
Brecha NC #5
  │
  ├── Acción #1 (accion_previa_id = NULL)  ← raíz
  │     estado: Eficaz
  │
  ├── Acción #2 (accion_previa_id = 1)    ← hija de #1
  │     estado: En_Progreso
  │
  └── Acción #3 (accion_previa_id = 2)    ← nieta de #1
        estado: Pendiente
```

- Cada acción apunta a su predecesora
- Profundidad ilimitada
- Se lee de arriba a abajo (cronológico)

---

# Acciones — Máquina de Estados

```
Pendiente → En_Progreso → Eficaz
                        → No_Eficaz
```

## Reglas de negocio
- Solo Responsable SGC o Admin pueden cambiar estado
- Cada cambio genera registro en `ACCIONES_CORRECTIVAS_HIST`
- Cada cambio notifica a los responsables de la NC padre
- El Kanban permite drag-and-drop entre columnas

## Eliminación en cascada
```
deleteAction(id=1):
  1. Buscar hijos recursivamente: [1, 2, 3]
  2. Eliminar en orden inverso: DELETE #3, #2, #1
```
Usa spread + reverse para no mutar el array original.

---

# Kanban — Funcionalidades UI

## Componente ActionKanbanBoard.jsx

- **4 columnas:** Pendiente, En Progreso, Implementada, Requiere Ajuste
- **Drag-and-drop** con HTML5 Drag API (sin librería externa)
- **Vistas filtradas:** Ver todo / Ver Eficacia / Ver Progreso
- **Inline editing:** editar campos directamente en la tarjeta
- **Crear hijas:** formulario inline dentro de cada tarjeta
- **Anti-flickering:** useRef para contadores de dragEnter/dragLeave

## Permisos
- Solo Responsable puede arrastrar y editar
- Evaluador ve el tablero en modo lectura
