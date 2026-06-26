# Design: RF1 - CRUD de Espacios de Trabajo

## Overview

Arquitectura técnica del CRUD de Espacios de Trabajo, cubriendo base de datos, backend API, y frontend React.

## Database Schema

**Tabla:** `ESPACIO_TRABAJO`

```sql
CREATE TABLE ESPACIO_TRABAJO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Relación clave:** Al crear workspace, se insertan filas en `EVALUACION_REQUISITO` (una por cada requisito ISO existente, estado "NA").

**Comportamiento de eliminación:**
- `EVALUACION_REQUISITO` → CASCADE (se eliminan evaluaciones del cliente)
- `USUARIOS.workspace_id` → SET NULL (usuarios quedan sin asignar, no se borran)
- Archivos en Google Drive → No se eliminan (respaldo histórico intencional)

## Backend API

### Endpoints

| Método | Ruta | Middleware | Controller |
|--------|------|------------|------------|
| POST | `/api/workspaces` | requireAuth, requireRole('Admin') | createWorkspace |
| GET | `/api/workspaces` | requireAuth, requireRole('Admin') | listWorkspaces |
| GET | `/api/workspaces/:id` | requireAuth, requireRole('Admin') | getWorkspace |
| PUT | `/api/workspaces/:id` | requireAuth, requireRole('Admin') | updateWorkspace |
| DELETE | `/api/workspaces/:id` | requireAuth, requireRole('Admin') | deleteWorkspace |

### Controller Logic

**createWorkspace:**
1. Validar `nombre_cliente` presente (400 si falta)
2. INSERT en ESPACIO_TRABAJO
3. Seed de EVALUACION_REQUISITO con SELECT de todos los REQUISITOS_BASE (no bloqueante)
4. Retornar 201 { id }

**deleteWorkspace:**
1. Validar `id` presente
2. DELETE FROM ESPACIO_TRABAJO WHERE id = ? (cascade maneja el resto)
3. Retornar { id }

### Archivos

- Rutas: `backend-js/src/routes/workspaces.js`
- Controller: `backend-js/src/controllers/useWorkspaces.js`
- Montaje: `app.use('/api/workspaces', workspacesRouter)` en `src/index.js`

## Frontend Architecture

### Hook: `useWorkspaces.js`

Custom hook que encapsula CRUD via `fetchWithAuth`:
- `loadWorkspaces()` → GET
- `createWorkspace(payload)` → POST + reload
- `updateWorkspace(id, payload)` → PUT + reload
- `deleteWorkspace(id)` → DELETE + reload

### Page: `WorkspacesManager.jsx`

- Protegida con `<Protected role="Admin">`
- Tabla con edición inline (react-hook-form)
- Búsqueda client-side con `useMemo`
- `ConfirmDialog` con `requireText="eliminar"` y `z-[9999]` (cubre toda la pantalla)
- Botón "Agregar Espacio" en la barra de título de la tabla

## Data Flow

```
WorkspacesManager.jsx
  └── useWorkspaces() hook
        └── fetchWithAuth('/api/workspaces', ...)
              └── requireAuth → requireRole('Admin') → controller
                    └── pool.execute(SQL)
                          └── MySQL: ESPACIO_TRABAJO + EVALUACION_REQUISITO
```
