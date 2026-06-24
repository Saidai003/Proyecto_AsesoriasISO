# ProyectoISO

Aplicación web para gestionar evidencias, auditorías y cumplimiento de requisitos ISO 9001:2015.

## Estructura

- `frontend/` — Interfaz React (Vite)
- `backend-js/` — API Node.js (Express)
- `seeds/` — Scripts SQL de inicialización
- `docker-compose.yml` — Orquestación de servicios

## Requisitos

- Docker y Docker Compose
- Node.js (solo para desarrollo local sin Docker)

## Inicio rápido

```bash
docker compose up --build -d
```

En el primer arranque, MySQL ejecuta los scripts de inicialización automáticamente y el backend aplica seeds de forma idempotente.

## Configuración

Copia `.env.example` → `.env` y configura las variables necesarias antes de iniciar.

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 5173 | App React con Vite |
| Backend | 3000 | API REST Express |
| MySQL | 3306 | Base de datos |

## Funcionalidades principales

- Gestión de requisitos ISO 9001:2015 (cláusulas 4–10)
- Evaluación de cumplimiento por workspace
- Dashboards con gráficos radar por cláusula
- Gestión de brechas (no conformidades) con flujo de estados
- Acciones correctivas y seguimiento
- Carga y validación de evidencias (integración Google Drive)
- Sistema de notificaciones
- Roles: Admin, Evaluador, Responsable SGC, Operativo

## Reiniciar desde cero

```bash
docker compose down -v
docker compose up --build -d
```

## Licencia

Proyecto académico — uso interno.
