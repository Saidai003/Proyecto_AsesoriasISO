# Design: RF2 - CRUD de Usuarios

## Overview

Arquitectura técnica del CRUD de Usuarios, cubriendo base de datos, backend API, y frontend React.

## Database Schema

**Tabla:** `USUARIOS`

```sql
CREATE TABLE USUARIOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT,                    -- FK → ESPACIO_TRABAJO (ON DELETE SET NULL)
    role_id INT,                         -- FK → ROLES (ON DELETE SET NULL)
    nombre VARCHAR(255),
    email VARCHAR(320) UNIQUE,
    password_hash VARCHAR(255),
    reset_token VARCHAR(255),
    expiration_date DATETIME,
    estado_invitacion ENUM('Pendiente','Aceptada','Expirada') DEFAULT 'Pendiente',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

**Comportamiento de eliminación de usuario:**
- `SESIONES_USUARIO` → CASCADE (sesiones técnicas, prescindibles)
- `SESSIONS` → CASCADE (tokens de refresh, deben expirar)
- `NOTIFICACIONES` → CASCADE (notificaciones del usuario, no se muestran a nadie más)
- `ACTIVIDAD_USUARIO` → SET NULL (se preserva el registro de actividad)
- `EVIDENCIAS.usuario_carga_id` → SET NULL (evidencia queda, autor queda NULL)
- `AUDITORIA_NC.evaluador_id` → SET NULL (NC queda, referencia al evaluador se pierde)
- `ACCIONES_CORRECTIVAS.autor_id` → SET NULL (acción queda, referencia al autor se pierde)
- `CHAT_MESSAGES.autor_id` → SET NULL (mensaje queda, autor queda NULL)
- `SCHEDULED_NOTIFICATIONS.usuario_id` → SET NULL (notificación programada persiste)

**Estado de invitación:**

| Estado | Significado | Transición |
|--------|-------------|------------|
| Pendiente | Creado por Admin, no ha cambiado contraseña | Creación o reset de password por Admin |
| Aceptada | Usuario cambió su contraseña exitosamente | PUT /:id/password exitoso |
| Expirada | (Reservado, no se usa actualmente) | — |

## Backend API

### Endpoints

| Método | Ruta | Middleware | Controller | CA |
|--------|------|------------|------------|-----|
| POST | `/api/users` | requireAuth, requireRole('Admin') | createUser | RF2-CA-001 |
| GET | `/api/users` | requireAuth, requireRole('Admin') | listUsers | RF2-CA-002 |
| GET | `/api/users/responsables` | requireAuth | listResponsables | (apoyo) |
| GET | `/api/users/:id` | requireAuth, requireRole('Admin') | getUser | RF2-CA-002 |
| PUT | `/api/users/:id/password` | requireAuth | updateUserPassword | (cambio propio) |
| PUT | `/api/users/:id` | requireAuth, requireRole('Admin') | updateUser | RF2-CA-003 |
| DELETE | `/api/users/:id` | requireAuth, requireRole('Admin') | deleteUser | RF2-CA-004 |
| PUT | `/api/users/:id/workspace` | requireAuth, requireRole('Admin') | assignUserToWorkspace | RF2-CA-006 |

### Controller Logic

**createUser:**
1. Validar campos obligatorios (nombre, email, workspace_id, role_id) → 400
2. Normalizar email (lowercase, trim)
3. Pre-check duplicado email → 409
4. Verificar workspace existe → 404
5. Verificar rol existe → 404
6. bcrypt.hash(password, 10) si se proveyó
7. INSERT con estado_invitacion = 'Pendiente'
8. Retornar 201 { id }

**updateUserPassword:**
1. Verificar que req.user.id === params.id → 403
2. Validar currentPassword y password presentes → 400
3. Comparar currentPassword con hash en DB → 401
4. bcrypt.hash(newPassword, 10)
5. UPDATE password_hash + estado_invitacion = 'Aceptada'

### Archivos

- Rutas: `backend-js/src/routes/users.js`
- Controller: `backend-js/src/controllers/userController.js`
- Montaje: `app.use('/api/users', usersRouter)` en `src/index.js`

## Frontend Architecture

### Hook: `useUsers.js`

Custom hook que encapsula CRUD via `fetchWithAuth`:
- `loadUsers()` → GET /api/users
- `createUser(payload)` → POST + reload
- `updateUser(id, payload)` → PUT + reload
- `deleteUser(id)` → DELETE + reload
- `assignWorkspace(id, workspace_id)` → PUT /:id/workspace + reload

> **Referencia:** Ver [fetchWithAuth](../shared/fetch-with-auth.md)

### Page: `UsersManager.jsx`

- Protegida con `<Protected role="Admin">`
- Tabla con columnas: Nombre, Email, Rol, Workspace, Estado, Acciones
- Creación y edición inline con fila expandida (incluye campo password)
- Búsqueda multi-campo client-side con `useMemo`
- `ConfirmDialog` con `requireText="eliminar"` y `z-[9999]`
- Select de roles: Administrador, Evaluador, Responsable SGC
- Select de workspaces: cargados del hook `useWorkspaces`
- Indicador de estado: badge "Pendiente" (amarillo) o "Activo" (verde)

> **Referencia middleware:** Ver [auth-middleware](../shared/auth-middleware.md)

## Data Flow

```
UsersManager.jsx
  └── useUsers() hook + useWorkspaces() hook
        └── fetchWithAuth('/api/users', ...)
              └── requireAuth → requireRole('Admin') → controller
                    └── pool.execute(SQL)
                          └── MySQL: USUARIOS (+ validaciones en ESPACIO_TRABAJO, ROLES)
```
