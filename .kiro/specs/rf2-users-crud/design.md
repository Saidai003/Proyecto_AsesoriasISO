# Design: RF2 - CRUD de Usuarios

## Architecture

### Patrón general

Sigue la misma arquitectura de tres capas del proyecto:

```
Frontend (React)  →  Backend API (Express)  →  MySQL
    Settings.jsx        userController.js        USUARIOS
    UsersManager.jsx    routes/users.js
    useUsers.js hook
```

### Archivos involucrados

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Rutas | `backend-js/src/routes/users.js` | Definición de endpoints + middleware |
| Controller | `backend-js/src/controllers/userController.js` | Lógica de negocio |
| Hook | `frontend/src/hooks/useUsers.js` | Acceso a API desde React |
| Página Admin | `frontend/src/pages/UsersManager.jsx` | CRUD visual (Admin) |
| Página Usuario | `frontend/src/pages/Settings.jsx` | Cambio de contraseña propio |

> **Referencias compartidas:** [auth-middleware](../shared/auth-middleware.md) · [fetchWithAuth](../shared/fetch-with-auth.md)

## Components and Interfaces

### Endpoints REST

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

### Controller: createUser

1. Validar campos obligatorios (nombre, email, workspace_id, role_id) → 400
2. Normalizar email (lowercase, trim)
3. Pre-check duplicado email → 409
4. Verificar workspace existe → 404
5. Verificar rol existe → 404
6. bcrypt.hash(password, 10) si se proveyó
7. INSERT con estado_invitacion = 'Pendiente'
8. Retornar 201 { id }

### Controller: updateUserPassword

1. Verificar req.user.id === params.id → 403
2. Validar currentPassword y password presentes → 400
3. SELECT password_hash, estado_invitacion FROM USUARIOS
4. bcrypt.compare(currentPassword, hash) → 401 si falla
5. bcrypt.hash(newPassword, 10)
6. Si estado actual es 'Pendiente' → UPDATE hash + estado = 'Aceptada'
7. Si estado ya es 'Aceptada' → UPDATE solo hash (sin tocar estado)

### Frontend: Flujos de usuario

**Admin (UsersManager):** Tabla con CRUD inline, búsqueda multi-campo, ConfirmDialog con requireText="eliminar".

**Usuario (Settings):** Formulario de cambio de contraseña (actual + nueva + confirmar), botón de cerrar sesión.

## Data Models

### Tabla USUARIOS

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

### Comportamiento de eliminación (FKs desde otras tablas)

| Tabla dependiente | Columna FK | ON DELETE | Justificación |
|---|---|---|---|
| SESIONES_USUARIO | usuario_id | CASCADE | Datos técnicos prescindibles |
| SESSIONS | user_id | CASCADE | Tokens de refresh deben expirar |
| NOTIFICACIONES | usuario_id | CASCADE | No se muestran a nadie más |
| ACTIVIDAD_USUARIO | usuario_id | SET NULL | Preserva registro de auditoría |
| EVIDENCIAS | usuario_carga_id | SET NULL | Evidencia persiste sin autor |
| AUDITORIA_NC | evaluador_id | SET NULL | NC persiste sin referencia |
| ACCIONES_CORRECTIVAS | autor_id | SET NULL | Acción persiste sin autor |
| CHAT_MESSAGES | autor_id | SET NULL | Mensaje persiste anónimo |
| SCHEDULED_NOTIFICATIONS | usuario_id | SET NULL | Notificación persiste para reasignación |

### Diagrama de estados (estado_invitacion)

```
┌──────────────┐     Admin crea usuario      ┌────────────┐
│  (no existe) │ ────────────────────────►   │ Pendiente  │
└──────────────┘                              └─────┬──────┘
                                                    │
                                                    │ Usuario cambia contraseña (PUT /:id/password)
                                                    ▼
         Admin resetea password               ┌────────────┐
         ┌────────────────────────────────── │  Aceptada  │◄──┐
         │                                    └────────────┘   │ Cambio posterior
         ▼                                                     │ (solo actualiza hash)
   ┌────────────┐                                              │
   │ Pendiente  │ ─── usuario cambia ───────────────────────────┘
   └────────────┘
```

## Error Handling

| Situación | HTTP | Código de error | Mensaje UI |
|-----------|------|-----------------|------------|
| Campos obligatorios faltantes | 400 | `nombre, email, workspace_id and role_id are required` | — |
| Email duplicado | 409 | `email_exists` | "El email ya está registrado" |
| Workspace no encontrado | 404 | `workspace_not_found` | — |
| Rol no encontrado | 404 | `role_not_found` | — |
| Usuario no encontrado | 404 | `not_found` | — |
| Contraseña actual incorrecta | 401 | `invalid_current_password` | "La contraseña actual no es correcta" |
| Password vacía | 400 | `password_required` | "Ingresa una contraseña válida" |
| Intento de cambiar password de otro | 403 | `forbidden` | — |
| Passwords no coinciden (frontend) | — | — | "Las contraseñas nuevas no coinciden" |

## Testing Strategy

### Tests unitarios existentes

Archivo: `backend-js/pruebas/unitarias/userController.test.js`

- createUser retorna 201 con id
- createUser retorna 409 si email duplicado
- createUser retorna 400 si faltan campos
- getUser retorna 404 si no existe
- deleteUser ejecuta DELETE correctamente

### Cobertura pendiente

- updateUserPassword: validar transición Pendiente → Aceptada
- updateUserPassword: validar que no cambia estado si ya es Aceptada
- updateUser con password: verificar que estado vuelve a Pendiente

## Correctness Properties

- Un usuario siempre tiene email único (enforced a nivel DB con UNIQUE constraint + pre-check en controller).
- Un usuario creado por Admin siempre inicia en estado "Pendiente" hasta que cambie su contraseña.
- Solo el propio usuario puede ejecutar updateUserPassword (verificación req.user.id === params.id).
- El hash bcrypt siempre usa 10 rounds; nunca se almacena password en texto plano.
- Al eliminar un usuario, toda la información histórica (auditorías, evidencias, acciones) se preserva con referencia NULL.
