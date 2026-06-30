---
marp: true
paginate: true
header: "BACKUP — Preguntas de Comisión"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Despliegue — Docker Compose

## 3 servicios orquestados

```yaml
services:
  mysql:      # DB con healthcheck + seeds automáticos
  backend-js: # API + WebSocket (depende de mysql healthy)
  frontend:   # Vite dev server (depende de backend)
```

## Ventajas
- Entorno reproducible (dev = prod)
- Seeds se ejecutan automáticamente en primer arranque
- Healthcheck evita race conditions en startup
- Un comando: `docker compose up`

---

# Despliegue — ¿Por qué no Kubernetes?

| Criterio | Docker Compose | Kubernetes |
|----------|---------------|------------|
| Complejidad | Baja | Alta |
| Escala esperada | Decenas de usuarios | Miles+ |
| Experiencia equipo | ✅ | ❌ |
| Auto-scaling | No | Sí |
| Costo operacional | Mínimo | Significativo |

**Decisión:** el MVP tiene 1 servidor de producción y decenas de usuarios. Docker Compose es suficiente. K8s es over-engineering para este contexto.

---

# Despliegue — Startup Sequence

```javascript
async function startup() {
  // 1. Esperar DB disponible (retry loop, max 60 intentos)
  await waitForDB()
  
  // 2. Verificar seeds (idempotente)
  require('./scripts/ensureSeed.js')
  
  // 3. Iniciar worker de notificaciones programadas
  startNotificationWorker()  // setInterval 30s
  
  // 4. Crear servidor HTTP + WebSocket
  const server = http.createServer(app)
  initWs(server)
  server.listen(PORT)
}
```

Secuencia defensiva: si la DB no está lista, el backend no arranca.
