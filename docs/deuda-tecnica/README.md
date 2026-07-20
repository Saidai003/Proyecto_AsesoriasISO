# Registro de Deuda Técnica

> **Proyecto:** Gestor GAP ISO 9001:2015  
> **Última actualización:** 29/06/2026

---

## Origen de la deuda

Este proyecto acumuló deuda técnica significativa por adoptar un enfoque de "vibe coding":
- Se priorizó velocidad de implementación sobre revisión y calidad
- Features se entregaron sin revisión inmediata del código generado por IA
- Se postergaron correcciones para "un momento futuro" que nunca llegó
- Archivos crecieron sin refactorización (RequirementContent.jsx: +1200 líneas)

### Lección aprendida — Cómo trabajar con IA correctamente

1. **Diseñar y segmentar tareas de forma granular** — si el resultado supera 50 líneas de código, la tarea debió dividirse
2. **Revisar inmediatamente** cada tarea completada — bajo 50 líneas se revisa rápido y se crean tests si corresponde
3. **Intercalar tareas de auditoría/mantenibilidad** — cada 3-5 tareas funcionales, una tarea de auditoría

### Justificación de adoptar esta forma de trabajo

En toda la historia de la ciencia de la computación, cada salto de productividad vino con una nueva capa de abstracción que los ingenieros tuvieron que aprender a usar correctamente:

- **Ensamblador → C:** dejamos de escribir instrucciones máquina, pero tuvimos que aprender gestión de memoria
- **C → Java/C#:** dejamos de gestionar memoria manualmente, pero tuvimos que aprender frameworks y patrones OOP
- **Código manual → Frameworks:** dejamos de reinventar routing/auth/ORM, pero tuvimos que aprender las convenciones del framework
- **Código manual → IA generativa:** dejamos de escribir línea por línea, pero tenemos que aprender a diseñar, segmentar, revisar, y validar

El vibe coding es la adopción sin disciplina de la última abstracción. El "vibe engineering" es la adopción con disciplina: usas la IA como generador de código bajo supervisión de ingeniería (diseño previo, revisión inmediata, testing, auditoría periódica). No es diferente de confiar en un compilador: confías en que genera código máquina correcto, pero no confías ciegamente en que tu programa es correcto solo porque compila.

La IA no reemplaza al ingeniero. Reemplaza la escritura manual de código. El ingeniero sigue siendo responsable del diseño, la revisión, y la validación.

---

## Índice de problemas

| ID | Severidad | Tipo | Archivo |
| [DT-009](./DT-009-cobertura-funciones-criticas.md) | Alta | Calidad / Pruebas | Controllers y driveService.js |
----|-----------|------|---------|
| [DT-001](./DT-001-requirementcontent-gigante.md) | Media | Mantenibilidad | RequirementContent.jsx |
| [DT-002](./DT-002-nomenclatura-nc-vs-brecha.md) | Baja | Claridad | Backend + DB |
| [DT-003](./DT-003-idor-faltante.md) | Alta | Seguridad | Varios controllers |
| [DT-004](./DT-004-console-logs-debug.md) | Baja | Limpieza | accionesController.js |
| [DT-007](./DT-007-historial-acciones-duplicado.md) | Baja | Mantenibilidad | accionesController.js |
| [DT-008](./DT-008-validacion-acciones-vacias.md) | Media | Validación | ncController.js, ActionKanbanBoard.jsx |

---

## Cómo agregar nuevos items

Crear un archivo `DT-XXX-nombre-corto.md` en esta carpeta con el formato:

```markdown
# DT-XXX: [Título corto]

**Severidad:** Alta | Media | Baja
**Tipo:** Seguridad | Mantenibilidad | Performance | Limpieza | Calidad
**Archivo(s):** [rutas relevantes]

## Problema
[Qué está mal y por qué importa]

## Solución propuesta
[Qué hacer para arreglarlo]

## Estado
Pendiente | En progreso | Completado | Aceptado (no se corrige)
```

Luego agregar la fila al índice de este README.
