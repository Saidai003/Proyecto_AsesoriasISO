# Design: RF1 - CRUD de Espacios de Trabajo

## Architecture

### Patrón general

```
Frontend (React)  →  Backend API (Express)  →  MySQL
    WorkspacesManager.jsx   useWorkspaces controller   ESPACIO_TRABAJO
    useWorkspaces.js hook   routes/workspaces.js       EVALUACION_REQUISITO
```

### Archivos involucrados

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Rutas | `backend-js/src/routes/workspaces.js` | Endpoints + middleware Admin |
| Controller | `backend-js/src/controllers/useWorkspaces.js` | Lógica CRUD + seed evaluaciones |
| Hook | `frontend/src/hooks/useWorkspaces.js` | Acceso a API desde React |
| Página | `frontend/src/pages/WorkspacesManager.jsx` | CRUD visual (Admin) |

> **Referencias compartidas:** [auth-middleware](../shared/auth-middleware.md) · [fetchWithAuth](../shared/fetch-with-auth.md)

## Components and Interfaces

### Endpoints REST

| Método | Ruta | Middleware | Controller | CA |
|--------|------|------------|------------|-----|
| POST | `/api/workspaces` | requireAuth, requireRole('Admin') | createWorkspace | RF1-CA-001 |
| GET | `/api/workspaces` | requireAuth, requireRole('Admin') | listWorkspaces | RF1-CA-002 |
| GET | `/api/workspaces/:id` | requireAuth, requireRole('Admin') | getWorkspace | RF1-CA-002 |
| PUT | `/api/workspaces/:id` | requireAuth, requireRole('Admin') | updateWorkspace | RF1-CA-003 |
| DELETE | `/api/workspaces/:id` | requireAuth, requireRole('Admin') | deleteWorkspace | RF1-CA-004 |

### Controller: createWorkspace

1. Validar `nombre_cliente` presente → 400
2. INSERT INTO ESPACIO_TRABAJO
3. Seed: INSERT INTO EVALUACION_REQUISITO para todos los REQUISITOS_BASE con estado "NA" (no bloqueante si falla)
4. Retornar 201 { id }

### Controller: deleteWorkspace

1. Validar `id` presente → 400
2. DELETE FROM ESPACIO_TRABAJO WHERE id = ? (cascade en DB maneja evaluaciones)
3. Retornar { id }

### Frontend: UsersManager

Tabla con CRUD inline, botón "Agregar Espacio" en la barra de título, búsqueda client-side, ConfirmDialog con requireText="eliminar".

## Data Models

### Tabla ESPACIO_TRABAJO

```sql
CREATE TABLE ESPACIO_TRABAJO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Comportamiento de eliminación (cascada)

```
ESPACIO_TRABAJO (eliminado)
  → EVALUACION_REQUISITO (CASCADE) — evaluaciones del cliente
      → EVIDENCIAS (CASCADE) — archivos de evidencia en DB
          → EVIDENCIAS_LOG (CASCADE) — logs de evidencia
      → EVALUACION_REQUISITO_HIST (CASCADE) — historial
      → AUDITORIA_NC (CASCADE) — brechas del cliente
          → ACCIONES_CORRECTIVAS (SET NULL en auditoria_nc_id)
          → AUDITORIA_NC_HIST (CASCADE)
          → CHAT_MESSAGES (CASCADE)
  → USUARIOS.workspace_id (SET NULL) — usuarios quedan sin asignar
```

**Decisión sobre Google Drive:** Los archivos de evidencia en Drive NO se eliminan. Quedan como respaldo histórico.

## Error Handling

| Situación | HTTP | Código |
|-----------|------|--------|
| nombre_cliente faltante | 400 | `nombre_cliente required` |
| Workspace no encontrado (GET /:id) | 404 | `not_found` |
| id faltante (PUT/DELETE) | 400 | `id required` |
| Error interno DB | 500 | `internal_error` |

## Testing Strategy

### Tests unitarios existentes

Archivo: `backend-js/pruebas/unitarias/workspacesController.test.js`

- createWorkspace retorna 201 con id
- createWorkspace ejecuta seed de evaluaciones
- getWorkspace retorna 404 si no existe

## Correctness Properties

- Al crear un workspace, siempre se intenta el seed de EVALUACION_REQUISITO para todos los requisitos existentes (aunque no sea bloqueante).
- Solo Admin puede ejecutar operaciones CRUD sobre workspaces.
- La eliminación de un workspace jamás elimina usuarios (SET NULL).
- La eliminación de un workspace jamás elimina archivos físicos de Google Drive.
- El filtrado de búsqueda es client-side (aceptable para volumen bajo de datos).
