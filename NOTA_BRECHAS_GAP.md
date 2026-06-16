# Nota de Cambio: Terminología de Brechas en el Frontend

## Resumen del cambio

Se actualizó únicamente el frontend para adaptar la terminología de auditoría hacia un enfoque de GAP Analysis.

- En la vista de requisito, la sección de listado pasó de "No conformidades" a **"Brechas Detectadas en el GAP Analysis"**.
- El botón de creación cambió de **"Crear NC"** a **"Registrar Brecha de Cumplimiento"**.
- En la vista de detalle del plan de cierre, el título principal cambió de **"No Conformidad #n"** a **"Brecha #n"**.
- El subtítulo ahora sugiere **"Descripción de la Brecha / Falta de la Norma"**.
- El kanban se renombró a **"Plan de Implementación (Acciones Correctivas)"** y el botón de creación pasó a **"Asignar Nueva Acción / Tarea"**.
- Se renombraron los estados visuales de kanban: **"Eficaz" → "Implementada / Cumplida"** y **"No eficaz" → "Requiere Ajuste"**.

## Archivos modificados

- `frontend/src/pages/RequirementView.jsx`
- `frontend/src/pages/RequirementContent.jsx`
- `frontend/src/pages/NCView.jsx`
- `frontend/src/components/CreateRootAction.jsx`
- `frontend/src/components/ActionKanbanBoard.jsx`
- `frontend/src/lib/ncHelpers.js`

## Recomendaciones de mantenimiento futuras

Este cambio es estrictamente de presentación. Para asegurar la mantenibilidad a largo plazo, se debe realizar una limpieza más profunda de la plataforma:

1. Renombrar archivos y componentes que aún utilizan la sigla o el término antiguo (`NC`, `No Conformidad`) a una terminología consistente con el nuevo enfoque, por ejemplo `Brecha`, `Gap`, `Plan de Acción`.
2. Cambiar nombres de tablas, columnas y entidades en la base de datos que reflejen el concepto antiguo de `AUDITORIA_NC`, `AUDITORIA_NC_RESPONSABLES`, `estado_validacion`, `estado_flujo`, etc., si el dominio del negocio lo permite.
3. Actualizar rutas, servicios, controladores y API para que los endpoints y payloads usen nombres alineados con el nuevo lenguaje de la plataforma.
4. Revisar pruebas automáticas, scripts y documentación para eliminar referencias a términos obsoletos y evitar inconsistencias futuras.
5. Evaluar si es necesario aplicar un refactor en código backend y frontend para separar claramente la lógica de auditoría de la lógica de GAP Analysis.

## Nota

Mantener solo el cambio visual puede causar deuda técnica si el backend y la base de datos siguen usando la terminología antigua. Por eso es importante alinear también los nombres persistentes y de integración en una segunda fase.
