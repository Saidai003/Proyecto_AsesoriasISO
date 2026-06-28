# Eliminación de un Workspace — Efectos en Cascada

## Qué pasa cuando se elimina un espacio de trabajo

Al ejecutar `DELETE FROM ESPACIO_TRABAJO WHERE id = ?`, MySQL procesa las foreign keys:

```
ESPACIO_TRABAJO (eliminado)
  → EVALUACION_REQUISITO (CASCADE) — evaluaciones del cliente desaparecen
      → EVIDENCIAS (CASCADE) — registros de evidencia en DB desaparecen
          → EVIDENCIAS_LOG (CASCADE) — logs de evidencia desaparecen
      → EVALUACION_REQUISITO_HIST (CASCADE) — historial de evaluaciones desaparece
      → AUDITORIA_NC (CASCADE) — brechas del cliente desaparecen
          → ACCIONES_CORRECTIVAS (SET NULL en auditoria_nc_id) — quedan huérfanas
          → AUDITORIA_NC_HIST (CASCADE) — historial de brechas desaparece
          → CHAT_MESSAGES (CASCADE) — mensajes asociados desaparecen
  → USUARIOS.workspace_id (SET NULL) — usuarios quedan sin asignar, NO se eliminan
```

## Lo que NO se elimina

- **Usuarios**: quedan con `workspace_id = NULL` (pueden reasignarse)
- **Archivos en Google Drive**: permanecen como respaldo histórico. La metadata (drive_file_id) desaparece de la DB pero los archivos físicos persisten en Drive sin referencia.

## Protección en la interfaz

- Se requiere escribir "eliminar" en un ConfirmDialog antes de poder ejecutar la acción
- Solo Admin puede eliminar workspaces
- El mensaje de advertencia indica que la acción es irreversible

## Decisión deliberada

Los archivos en Drive se conservan intencionalmente como respaldo post-eliminación de un cliente. Si se necesitara auditoría posterior, los archivos seguirían disponibles en la carpeta de Drive correspondiente.
