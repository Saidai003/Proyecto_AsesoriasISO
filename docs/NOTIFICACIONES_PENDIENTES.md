# Notificaciones pendientes del sistema

## Alcance y criterio

Este inventario se basa en los eventos que hoy generan filas en `NOTIFICACIONES`, las notificaciones programadas en `SCHEDULED_NOTIFICATIONS` y los avisos locales del frontend. Una notificación pendiente debe ser **persistente**, asociada a un destinatario y abrir el recurso relacionado mediante un enlace. Los avisos locales de interfaz no sustituyen esa persistencia.

El rol Admin queda fuera de las notificaciones operativas: observa el contexto administrativo, pero no participa en el ciclo de evidencia, brecha o acción correctiva.

## Ya implementadas

| Evento | Destinatario actual | Tipo actual |
|---|---|---|
| Brecha creada y asignada | Responsable(s) asignado(s) | `NC_ASIGNADA` |
| Brecha actualizada | Responsable(s) asignado(s) | `NC_UPDATED` |
| Fecha de verificación alcanzada | Evaluador de la brecha | `Verificación NC` |
| Acción correctiva creada | Responsable(s) y Evaluador de la brecha | `ACCION_NC` |
| Estado de acción cambiado | Responsable(s) de la brecha | `ACCION_UPDATED` |

## Prioridad 0 — necesaria para cerrar el ciclo operativo

| ID | Evento faltante | Destinatario | Motivo y enlace esperado |
|---|---|---|---|
| NOTIF-01 | Responsable carga una evidencia nueva | Evaluador del requisito/workspace | Debe saber que existe material pendiente de revisión. Enlace: requisito o evidencia. |
| NOTIF-02 | Responsable reemplaza una evidencia | Evaluador que debe revisarla | Una versión nueva puede volver obsoleta la revisión anterior. Enlace: evidencia. |
| NOTIF-03 | Evaluador acepta o rechaza una evidencia | Responsable que la cargó | Comunica el resultado de la revisión y habilita corrección si corresponde. Enlace: evidencia. |
| NOTIF-04 | Responsable cambia la aceptación de una brecha (`Acepto`, `Parcial`, `No Acepto`) | Evaluador creador/asignado | El Evaluador necesita conocer si el hallazgo fue reconocido o discutido. Enlace: brecha. |
| NOTIF-05 | Responsable mueve una brecha a `Análisis` o `Ejecución` | Evaluador creador/asignado | Permite seguir el avance sin entrar periódicamente a cada brecha. Enlace: brecha. |
| NOTIF-06 | Acción correctiva pasa a `Eficaz` o `No_Eficaz` | Evaluador de la brecha | Hoy el aviso llega a responsables, pero el Evaluador necesita revisar eficacia o decidir re-trabajo. Enlace: brecha/acción. |
| NOTIF-07 | Mensaje nuevo en chat de requisito o brecha | Participantes distintos del autor | El chat es el canal cronológico de discusión; sin aviso persistente una respuesta puede pasar inadvertida. Enlace: requisito o brecha, idealmente al mensaje. |

## Prioridad 1 — seguimiento y prevención

| ID | Evento faltante | Destinatario | Regla sugerida |
|---|---|---|---|
| NOTIF-08 | Próxima verificación de eficacia | Evaluador | Recordatorios a 7 días y 1 día antes de la fecha programada. |
| NOTIF-09 | Verificación vencida | Evaluador y Responsable(s) | Avisar al vencer y repetir con frecuencia controlada hasta registrar una decisión. |
| NOTIF-10 | Brecha reabierta | Responsable(s) y Evaluador, excluyendo al actor | Indica que el cierre no se sostuvo o que se requiere re-trabajo. |
| NOTIF-11 | Evidencia rechazada sin reemplazo | Responsable que la cargó | Recordatorio después de un plazo configurable, no inmediatamente en cada consulta. |
| NOTIF-12 | Acción sin avance | Responsable de la acción y Evaluador | Recordatorio si se mantiene en `Pendiente` o `En_Progreso` más allá de un plazo definido. |

## Prioridad 2 — experiencia y administración

| ID | Evento faltante | Destinatario | Regla sugerida |
|---|---|---|---|
| NOTIF-13 | Cuenta creada o invitación disponible | Usuario invitado | Requiere un canal de entrega externo (correo) o una pantalla de activación accesible. |
| NOTIF-14 | Cambio de workspace o rol | Usuario afectado | Avisar que sus permisos/contexto fueron modificados y pedir nuevo inicio de sesión si corresponde. |
| NOTIF-15 | Resumen diario o semanal de pendientes | Responsable y Evaluador | Agrupar pendientes para evitar ruido de notificaciones individuales. |
| NOTIF-16 | Fallo persistente al procesar una notificación programada | Administrador técnico, no Admin operativo | Alerta técnica para evitar que una verificación quede sin recordatorio. |

## Reglas de implementación recomendadas

1. Crear las notificaciones en el backend junto al cambio que las origina; no depender de `window.dispatchEvent`, que solo produce un aviso local.
2. Excluir al actor cuando no sea útil notificarse a sí mismo.
3. Guardar, además de `tipo`, un identificador de recurso (`requisito_id`, `nc_id`, `evidencia_id` o `accion_id`) para navegación, limpieza y deduplicación confiables.
4. Evitar duplicados: una transición no debe crear varios avisos idénticos para el mismo destinatario y recurso.
5. Al cerrar o reabrir una brecha, revisar o invalidar recordatorios programados que ya no correspondan.
6. Mantener la conversación en el chat: las notificaciones deben avisar del evento, no duplicar su contenido ni exigir un comentario por cambio de estado.

## Orden recomendado de implementación

1. NOTIF-01 a NOTIF-07.
2. NOTIF-10, NOTIF-08 y NOTIF-09.
3. NOTIF-11, NOTIF-12 y las mejoras de modelo/deduplicación.
4. NOTIF-13 a NOTIF-16 solo cuando exista canal de correo, configuración de plazos y operación continua.