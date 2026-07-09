# MEJ-002: Segmentación más estricta de roles y permisos

**Prioridad:** Alta
**Tipo:** Mejora futura
**Archivo(s):** backend-js/src/controllers, frontend/src/pages, backend-js/src/routes, backend-js/src/middleware

## Contexto
El modelo actual de roles permite que un responsable interactúe con requisitos que no tiene asignados, por ejemplo subiendo archivos o participando en el chat de un requisito sin que exista una relación explícita de responsabilidad sobre ese elemento. En la práctica, el rol de responsable está más limitado en la gestión de brechas que en la interacción con requisitos, lo que genera ambigüedad operativa y un riesgo de permisos excesivos.

## Problema observado
- Un responsable puede realizar acciones de colaboración sobre requisitos que no tiene asignados.
- La capacidad de subir archivos o intervenir en conversaciones no está siempre limitada por la asignación real del requisito o la brecha.
- El sistema permite un nivel de libertad que puede ser útil en etapas tempranas, pero no es ideal para un modelo de control más estricto y trazable.

## Propuesta
En una siguiente iteración conviene implementar una segmentación de permisos más clara y completa, de modo que:
- un responsable solo pueda actuar sobre requisitos que tenga explícitamente asignados;
- las acciones de carga de evidencia, chat, comentarios y gestión de brechas estén restringidas por el alcance de esa asignación;
- los permisos se definan de forma más granular según rol, alcance de trabajo y relación con el requisito o la brecha;
- la interfaz y la API reflejen de forma consistente estas reglas para evitar accesos no deseados.

## Beneficios esperados
- Mayor seguridad y control de acceso.
- Menor riesgo de operaciones fuera de contexto.
- Mejor trazabilidad de responsabilidades.
- Un modelo más alineado con el principio de mínimo privilegio.

## Idea de implementación futura
Se podría evolucionar hacia un modelo en el que cada acción valide explícitamente:
1. el rol del usuario,
2. si el recurso involucrado está dentro de su ámbito de asignación,
3. y si tiene permiso para ejecutar la acción concreta (ver, editar, comentar, subir evidencia, cerrar brecha, etc.).

Esto permitiría pasar de un modelo de permisos amplios a uno más restrictivo, predecible y fácil de auditar.
