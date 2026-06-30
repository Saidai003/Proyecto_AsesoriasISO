# ON DELETE CASCADE vs SET NULL — Cuándo usar cada uno

## El problema

No se recomienda usar `ON DELETE CASCADE` de forma indiscriminada. Es útil para datos prescindibles, pero peligroso para información crítica. Un simple DELETE puede borrar registros en múltiples tablas y provocar pérdida accidental de datos históricos.

## Regla general

- **CASCADE**: Cuando los datos hijos no tienen sentido sin el padre (sesiones, tokens, evaluaciones de un workspace eliminado).
- **SET NULL**: Cuando los datos hijos tienen valor histórico independiente del padre (auditorías, evidencias, actividad de un usuario eliminado).

## Caso real en este proyecto

La FK `USUARIOS.workspace_id → ESPACIO_TRABAJO` tenía `ON DELETE CASCADE`. Eso significaba que al borrar un workspace, **todos los usuarios asignados se eliminaban silenciosamente**.

### Corrección aplicada

```sql
-- ANTES (peligroso):
CONSTRAINT fk_usuarios_workspace FOREIGN KEY (workspace_id) REFERENCES ESPACIO_TRABAJO(id) ON DELETE CASCADE

-- DESPUÉS (seguro):
CONSTRAINT fk_usuarios_workspace FOREIGN KEY (workspace_id) REFERENCES ESPACIO_TRABAJO(id) ON DELETE SET NULL
```

Ahora al eliminar un workspace, los usuarios simplemente quedan con `workspace_id = NULL` (sin asignar) pero siguen existiendo.

## Tabla resumen del proyecto

### CASCADE seguro (datos prescindibles sin el padre)
- `SESIONES_USUARIO → USUARIOS`: sesiones técnicas
- `SESSIONS → USUARIOS`: tokens de refresh
- `NOTIFICACIONES → USUARIOS`: no se muestran a nadie más
- `EVALUACION_REQUISITO → ESPACIO_TRABAJO`: evaluaciones del cliente eliminado
- `EVIDENCIAS → EVALUACION_REQUISITO`: evidencias de evaluación eliminada
- `*_HIST → padre`: historial pierde sentido sin el registro original

### SET NULL (preservar historial)
- `USUARIOS → ESPACIO_TRABAJO`: usuarios no deben morir con el workspace
- `ACTIVIDAD_USUARIO → USUARIOS`: log de auditoría se preserva
- `EVIDENCIAS.usuario_carga_id → USUARIOS`: evidencia queda, autor queda NULL
- `AUDITORIA_NC.evaluador_id → USUARIOS`: brecha queda, referencia se pierde
- `CHAT_MESSAGES.autor_id → USUARIOS`: mensaje queda anónimo
- `SCHEDULED_NOTIFICATIONS → USUARIOS`: notificación puede reasignarse
