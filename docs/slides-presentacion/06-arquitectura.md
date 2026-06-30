---
marp: true
paginate: true
header: "Taller de Titulación — Maximiliano Abascal"
footer: "Software Web de Gestión ISO | UDP 2026"
---

# Arquitectura del Sistema

**3 capas desacopladas** desplegadas con Docker Compose:

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | React 18 + Vite | SPA con componentes reutilizables, HMR rápido |
| Backend | Node.js + Express | API REST, JS full-stack, sin ORM |
| Base de datos | MySQL 8.0 | Relacional, ACID, integridad referencial |
| Tiempo real | WebSocket (ws) | Chat y notificaciones instantáneas |
| Almacenamiento | Google Drive API | Evidencias en la nube, carpetas por workspace |

---

# Diagrama C4 — Contexto

<!-- Insertar imagen del diagrama de contexto C4 -->
<!-- ![C4 Contexto](../img/C4-Contexto-fixed-1-2026-06-04-234518.png) -->

- 3 actores: Administrador, Evaluador, Responsable SGC
- 1 sistema web centralizado
- Conexión a Google Drive para evidencias
- Base de datos MySQL para persistencia

---

# Diagrama C4 — Contenedores

<!-- Insertar imagen del diagrama de contenedores C4 -->

| Contenedor | Responsabilidad |
|-----------|----------------|
| Frontend SPA | Interfaz, routing, formularios, radar charts |
| Backend API | Lógica de negocio, RBAC, WebSocket |
| MySQL | Persistencia, integridad, trazabilidad |
| Google Drive | Almacenamiento de archivos de evidencia |

---

# Decisiones Arquitectónicas Clave (ADR)

Se documentaron **11 ADRs** con alternativas evaluadas:

| ADR | Decisión | Alternativa descartada |
|-----|----------|----------------------|
| 001 | Arquitectura desacoplada | Monolito SSR, Microservicios |
| 004 | MySQL sin ORM | PostgreSQL, MongoDB, Sequelize |
| 006 | JWT + Refresh Token | Sessions+Redis, OAuth externo |
| 009 | fetchWithAuth custom | Axios, React Query |
| 011 | WebSocket (ws library) | Socket.IO, SSE, Polling |

Cada decisión incluye justificación y riesgos aceptados.
