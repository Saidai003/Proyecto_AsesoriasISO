---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Funcionalidades — Evidencias

## Integración con Google Drive

```
Google Drive (raíz configurada)
└── Development | Production
    └── {nombre_workspace}
        └── archivos de evidencia
```

- Upload: frontend envía base64 → backend sube a Drive → guarda `drive_file_id`
- Download/preview directo desde Drive
- Carpetas por workspace (segregación física)

---

# Evidencias — Flujo de Validación

## Máquina de estados

```
Pendiente → Aceptado
         → Rechazado
```

- Solo el Evaluador puede cambiar estado
- Cada cambio se registra en `EVIDENCIAS_LOG`
- Versionado por reemplazo (no múltiples filas)
- Historial visual con `EvidenceHistoryModal`

---

# Funcionalidades — Comunicación en Tiempo Real

## Chat contextual (WebSocket)
- Asociado a: requisitos, brechas, acciones, evidencias
- Mensajes aparecen instantáneamente para todos los conectados
- Metadata con autor, rol, timestamp

## Notificaciones
- Reutiliza la misma conexión WebSocket
- Worker background (cada 30s) procesa notificaciones programadas
- Tipos: NC asignada, acción actualizada, verificación pendiente
- Badge numérico en campana + sidebar
