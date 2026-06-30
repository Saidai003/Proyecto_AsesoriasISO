---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# WebSocket — Detalle Técnico

## ¿Por qué no Socket.IO?

| Criterio | ws (raw) | Socket.IO |
|----------|----------|-----------|
| Tamaño | ~3 KB | ~50 KB |
| Rooms/Namespaces | No necesarios | Built-in |
| Fallback a polling | No (WebSocket universal hoy) | Sí |
| Complejidad | Mínima | Agrega abstracción |

**Decisión:** el volumen esperado es bajo (decenas de usuarios). Se filtra por `nc_id`/`requisito_id` en la query, no se necesitan rooms.

---

# WebSocket — Arquitectura

```
Frontend                         Backend
────────                         ───────
POST /api/chat  ──────────→  chatController.postMessage()
                              INSERT → SELECT → broadcast
                                                    │
                              ←── ws: { type: 'chat:new', data }
                                          │
Todos los clientes conectados ←──────────┘
(filtran por nc_id/requisito_id en frontend)
```

## Notificaciones
- Reutilizan la misma conexión WS
- Worker background (setInterval 30s) procesa `SCHEDULED_NOTIFICATIONS`
- Evita canal separado → menor complejidad operativa

---

# ¿Por qué no Server-Sent Events (SSE)?

- SSE es unidireccional (server → client solamente)
- El chat necesita bidireccionalidad
- Los mensajes de chat se envían por POST HTTP pero se distribuyen por WS
- SSE no soporta reconexión con estado tan bien como WebSocket
- Nota: existe `services/sse.js` como alternativa no utilizada (exploración técnica)
