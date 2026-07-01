# Diagrama Núcleo — Flujo GAP + Brechas + Acciones + Evidencias

> Las 6 tablas centrales del sistema. Todo lo per-workspace cuelga de `EVALUACION_REQUISITO`.

```mermaid
erDiagram
    EVALUACION_REQUISITO {
        INT id PK
        INT requisito_base_id FK
        INT workspace_id FK
        ENUM estado_cumplimiento "Cumple|Parcial|No cumple|NA"
        INT ultima_edicion_por FK
        DATETIME fecha_ultima_edicion
    }

    AUDITORIA_NC {
        INT id PK
        INT evaluacion_requisito_id FK
        INT evaluador_id FK
        VARCHAR titulo
        TEXT descripcion
        VARCHAR estado_flujo "Abierta|Analisis|Ejecucion|Verificacion|Cerrada"
        ENUM estado_validacion "Acepto|Parcial|No Acepto"
        DATE fecha_verificacion_eficacia
        TEXT comentario_nc
        INT ultima_edicion_por FK
        DATETIME fecha_ultima_edicion
    }

    AUDITORIA_NC_HIST {
        INT id PK
        INT nc_id FK
        VARCHAR estado_flujo
        ENUM estado_validacion "Acepto|Parcial|No Acepto"
        TEXT comentario
        INT ultima_edicion_por FK
        DATETIME fecha_snapshot
    }

    ACCIONES_CORRECTIVAS {
        INT id PK
        INT auditoria_nc_id FK
        INT accion_previa_id FK "linked-list: accion padre"
        INT autor_id FK
        TEXT accion
        TEXT contenido_comentario
        ENUM estado_accion "Pendiente|En_Progreso|Eficaz|No_Eficaz"
        TEXT acciones_futuras_propuestas
        DATETIME fecha_accion
    }

    ACCIONES_CORRECTIVAS_HIST {
        INT id PK
        INT accion_id FK
        VARCHAR estado_anterior
        VARCHAR estado_nuevo
        INT usuario_id FK
        TEXT comentario
        DATETIME fecha_snapshot
    }

    EVIDENCIAS {
        INT id PK
        INT evaluacion_requisito_id FK
        INT usuario_carga_id FK
        VARCHAR nombre_archivo
        VARCHAR drive_file_id
        ENUM estado_validacion_archivo "Pendiente|Aceptado|Rechazado"
        TEXT comentario_evidencia
        DATETIME fecha_carga
    }

    EVIDENCIAS_LOG {
        INT id PK
        INT evidencia_id FK
        INT usuario_id FK
        ENUM tipo_accion "UPLOAD|DELETE|UPDATE|REPLACE|APPROVAL"
        TEXT detalle
        DATETIME fecha_accion
    }

    %% RELACIONES
    EVALUACION_REQUISITO ||--o{ AUDITORIA_NC       : "tiene brechas"
    EVALUACION_REQUISITO ||--o{ EVIDENCIAS         : "tiene evidencias"

    AUDITORIA_NC         ||--o{ AUDITORIA_NC_HIST  : "historial"
    AUDITORIA_NC         ||--o{ ACCIONES_CORRECTIVAS : "tiene acciones"

    ACCIONES_CORRECTIVAS ||--o{ ACCIONES_CORRECTIVAS : "hija de (linked-list)"
    ACCIONES_CORRECTIVAS ||--o{ ACCIONES_CORRECTIVAS_HIST : "historial"

    EVIDENCIAS           ||--o{ EVIDENCIAS_LOG     : "historial"
```

## Lectura del flujo

```
EVALUACION_REQUISITO  ← pivot central, 1 por requisito por workspace
  │
  ├── AUDITORIA_NC          ← brecha detectada en ese requisito
  │     ├── AUDITORIA_NC_HIST       ← cada cambio de estado queda registrado
  │     └── ACCIONES_CORRECTIVAS   ← acciones para cerrar la brecha
  │           ├── ACCIONES_CORRECTIVAS (hija, linked-list)
  │           └── ACCIONES_CORRECTIVAS_HIST  ← historial campo por campo
  │
  └── EVIDENCIAS            ← documentos que respaldan el requisito
        └── EVIDENCIAS_LOG  ← cada upload, reemplazo o aprobación
```
