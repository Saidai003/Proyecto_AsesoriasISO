# Documento de Diseño: Cambio de Contraseña en Primer Login

## Overview

Esta funcionalidad extiende el flujo de autenticación existente para detectar usuarios con estado `'Pendiente'` y forzarlos a cambiar su contraseña temporal antes de acceder al sistema. Los cambios abarcan:

1. **Validación de contraseña en creación de usuario** — reforzar `createUser` para rechazar contraseñas nulas/vacías o fuera del rango 8-72 caracteres.
2. **Detección de estado en login** — modificar el controlador de login para detectar `estado_invitacion = 'Pendiente'` y retornar una respuesta especial sin token.
3. **Nuevo endpoint público** — `POST /auth/first-login-password` que no requiere JWT, valida la contraseña temporal, actualiza el hash, cambia el estado a `'Aceptada'`, elimina sesiones previas y emite un token definitivo.
4. **Modal de cambio de contraseña** — componente React que se muestra sobre la página de login cuando el backend indica que se requiere cambio de contraseña.

## Architecture

### Diagrama de Flujo Principal

```
┌──────────────┐       POST /auth/login        ┌──────────────────┐
│   Login.jsx  │ ─────────────────────────────► │  authController  │
│              │                                │     .login()     │
└──────┬───────┘                                └────────┬─────────┘
       │                                                 │
       │  ◄── { status: 'requires_password_change',     │
       │        userId }                                 │
       │                                                 │
       ▼                                                 │
┌──────────────────────┐                                 │
│ ChangePasswordModal  │                                 │
│  (nueva contraseña)  │                                 │
└──────────┬───────────┘                                 │
           │                                             │
           │  POST /auth/first-login-password            │
           │  { userId, currentPassword, newPassword }   │
           ▼                                             │
┌──────────────────────────────┐                         │
│  authController              │                         │
│  .firstLoginPasswordChange() │                         │
└──────────┬───────────────────┘                         │
           │                                             │
           │  ◄── { accessToken, user }                  │
           │                                             │
           ▼                                             │
┌──────────────────────┐                                 │
│  AuthContext.login()  │  ──► almacenar token ──► /lobby│
└───────────────────────┘                                │
```

### Diagrama de Estados del Usuario

```
                  createUser (con password válido)
                         │
                         ▼
                  ┌─────────────┐
                  │  Pendiente  │
                  └──────┬──────┘
                         │
            POST /auth/first-login-password (éxito)
                         │
                         ▼
                  ┌─────────────┐
                  │  Aceptada   │ ──► Login normal con token
                  └─────────────┘
```

## Components and Interfaces

### Backend — Cambios en Controladores

#### 1. `authController.login()` — Modificación

Ubicación: `src/controllers/authController.js`

**Cambio:** Después de validar credenciales y antes de generar tokens, consultar `estado_invitacion` del usuario. Si es `'Pendiente'`, retornar respuesta especial. Si es `'Expirada'`, retornar 401 genérico.

Flujo interno:
1. Validar email/password presentes
2. Buscar usuario por email (agregar `estado_invitacion` al SELECT)
3. Comparar password con hash
4. **NUEVO:** Si `estado_invitacion === 'Pendiente'` → responder `{ status: 'requires_password_change', userId }`
5. **NUEVO:** Si `estado_invitacion === 'Expirada'` → responder 401 genérico
6. Si `estado_invitacion === 'Aceptada'` → flujo normal (generar tokens, cookie, etc.)

#### 2. `authController.firstLoginPasswordChange()` — Nuevo

Ubicación: `src/controllers/authController.js`

**Endpoint:** `POST /auth/first-login-password`  
**Autenticación:** Ninguna (endpoint público)

Flujo interno:
1. Extraer `{ userId, currentPassword, newPassword }` del body
2. Validar campos presentes
3. Validar longitud de `newPassword` (8-72 caracteres, no solo espacios)
4. Buscar usuario por `userId`
5. Verificar que `estado_invitacion === 'Pendiente'` (si es `'Aceptada'` → 403)
6. Comparar `currentPassword` con `password_hash` almacenado
7. Verificar que `newPassword !== currentPassword`
8. **Rate limiting:** Verificar intentos fallidos (máx 5 en 15 min)
9. Hashear `newPassword` con bcrypt (salt rounds = 10)
10. Actualizar `password_hash` y `estado_invitacion = 'Aceptada'` en BD
11. Eliminar todas las sesiones de refresh del usuario (tabla SESSIONS)
12. Generar accessToken y crear nueva refresh session
13. Enviar cookie con refreshToken y responder con `{ accessToken, user }`

#### 3. `userController.createUser()` — Modificación

Ubicación: `src/controllers/userController.js`

**Cambio:** Agregar validación estricta del campo `password` antes de procesar la creación.

Reglas de validación:
- Si `password` ausente, null, undefined, o solo espacios → HTTP 400 `'password_required'`
- Si `password.trim().length < 8` → HTTP 400 `'password_too_short'`
- Si `password.length > 72` → HTTP 400 `'password_too_long'`

### Backend — Cambios en Rutas

#### `src/routes/auth.js`

Agregar nueva ruta:
```
POST /auth/first-login-password → authController.firstLoginPasswordChange
```

Sin middleware `requireAuth` (es un endpoint público para usuarios que aún no tienen token).

### Backend — Rate Limiting

Mecanismo de rate limiting para el endpoint de primer login:

- **Almacenamiento:** En memoria (Map) con clave `userId`
- **Estructura:** `{ attempts: number, firstAttemptAt: timestamp }`
- **Regla:** Máximo 5 intentos fallidos por userId en ventana de 15 minutos
- **Reset:** Se limpia el contador al cambiar contraseña exitosamente o al expirar la ventana

> **Decisión:** Se usa almacenamiento en memoria en lugar de Redis/BD porque el sistema es single-instance y la ventana es corta. Si se escala a múltiples instancias, migrar a Redis.

### Frontend — Componentes

#### 1. `ChangePasswordModal.jsx` — Nuevo

Ubicación: `src/components/ChangePasswordModal.jsx`

**Props:**
- `userId: number` — ID del usuario que debe cambiar contraseña
- `currentPassword: string` — Contraseña temporal ingresada en el login
- `onSuccess: (response) => void` — Callback al completar exitosamente

**Estado interno:**
- `newPassword: string`
- `confirmPassword: string`
- `error: string | null`
- `loading: boolean`

**Comportamiento:**
- Modal no dismissible (sin botón cerrar, Escape deshabilitado, clic fuera ignorado)
- Campos tipo `password` (enmascarados)
- Botón de envío deshabilitado si:
  - `newPassword` o `confirmPassword` vacíos/solo espacios
  - `newPassword !== confirmPassword`
  - `loading === true`
- Al enviar: llamar a `POST /auth/first-login-password` con `{ userId, currentPassword, newPassword }`
- En éxito: invocar `onSuccess(response)`
- En error: mostrar mensaje descriptivo según código de error del backend

#### 2. `Login.jsx` — Modificación

Ubicación: `src/pages/Login.jsx`

**Cambios:**
- Agregar estado: `pendingUserId: number | null` y `pendingPassword: string | null`
- En el `submit`: si la respuesta del login contiene `status === 'requires_password_change'`, guardar `userId` y la contraseña ingresada en estado local (NO en contexto global ni localStorage)
- Renderizar `<ChangePasswordModal>` condicionalmente cuando `pendingUserId` no es null
- En `onSuccess` del modal: llamar a `login` del AuthContext con el token recibido y navegar a `/lobby`
- Mientras el modal es visible: bloquear navegación (usando `useEffect` con listener de `beforeunload` y/o bloqueo de router)

#### 3. `AuthContext.jsx` — Modificación mínima

Ubicación: `src/AuthContext.jsx`

**Cambio:** Modificar la función `login` para que NO lance error cuando la respuesta es `requires_password_change`. En lugar de eso, retornar el body completo para que `Login.jsx` pueda detectar el status.

Agregar método auxiliar `setAuthFromResponse(response)` que:
- Almacena `accessToken` en estado y localStorage
- Decodifica el token y establece `user`
- Programa refresh del token

Este método se usará tanto después del login normal como después del cambio de contraseña exitoso.

## Data Models

### Tabla USUARIOS (existente — sin cambios de esquema)

| Columna | Tipo | Relevancia |
|---------|------|-----------|
| id | INT AUTO_INCREMENT | PK, referenciado como userId |
| workspace_id | INT | FK a ESPACIO_TRABAJO |
| role_id | INT | FK a ROLES |
| nombre | VARCHAR | Nombre del usuario |
| email | VARCHAR UNIQUE | Credencial de login |
| password_hash | VARCHAR | Hash bcrypt de la contraseña |
| estado_invitacion | VARCHAR | `'Pendiente'`, `'Aceptada'`, `'Expirada'` |
| fecha_registro | DATETIME | Fecha de creación |

### Tabla SESSIONS (existente — sin cambios de esquema)

| Columna | Tipo | Relevancia |
|---------|------|-----------|
| user_id | INT | FK a USUARIOS |
| token | VARCHAR | Token de refresh (UUID) |
| expires_at | DATETIME | Expiración de la sesión |

### Rate Limit Store (nuevo — en memoria)

```
Map<number, { attempts: number, firstAttemptAt: number }>
```

- Clave: `userId`
- Se limpia automáticamente cuando `Date.now() - firstAttemptAt > 15 * 60 * 1000`

## Contratos de API

### POST /auth/login (modificado)

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Respuestas:**

| Caso | Status | Body |
|------|--------|------|
| Usuario Pendiente + credenciales válidas | 200 | `{ "status": "requires_password_change", "userId": 42 }` |
| Usuario Aceptada + credenciales válidas | 200 | `{ "accessToken": "...", "user": { "id", "nombre", "email", "role", "workspace_id" } }` |
| Credenciales inválidas (cualquier estado) | 401 | `{ "error": "invalid_credentials" }` |
| Campos faltantes | 400 | `{ "error": "email_and_password_required" }` |

### POST /auth/first-login-password (nuevo)

**Request:**
```json
{ "userId": 42, "currentPassword": "Admin123", "newPassword": "MiNuevaContraseña123" }
```

**Respuestas:**

| Caso | Status | Body |
|------|--------|------|
| Éxito | 200 | `{ "accessToken": "...", "user": { "id", "nombre", "email", "role", "workspace_id" } }` |
| Contraseña actual incorrecta | 401 | `{ "error": "invalid_current_password" }` |
| Usuario ya activado | 403 | `{ "error": "already_activated" }` |
| newPassword vacío/inválido | 400 | `{ "error": "new_password_required" }` |
| newPassword fuera de rango 8-72 | 400 | `{ "error": "invalid_password_length" }` |
| newPassword igual a currentPassword | 400 | `{ "error": "password_must_be_different" }` |
| Usuario no encontrado | 404 | `{ "error": "not_found" }` |
| Rate limit excedido | 429 | `{ "error": "too_many_attempts" }` |

**Cookie de respuesta (en éxito):**
```
Set-Cookie: refreshToken=<uuid>; HttpOnly; SameSite=Strict; Path=/; Max-Age=...
```

### POST /users (modificado — validación de password)

**Request (sin cambio de estructura):**
```json
{ "nombre": "...", "email": "...", "password": "...", "workspace_id": 1, "role_id": 2 }
```

**Nuevos errores de validación:**

| Caso | Status | Body |
|------|--------|------|
| Sin password / vacío / solo espacios | 400 | `{ "error": "password_required" }` |
| Password < 8 caracteres | 400 | `{ "error": "password_too_short" }` |
| Password > 72 caracteres | 400 | `{ "error": "password_too_long" }` |

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe cumplirse en todas las ejecuciones válidas de un sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquina.*

### Property 1: Validación de longitud de contraseña en createUser

*Para cualquier* cadena `password` proporcionada al endpoint de creación de usuario: si la cadena (después de trim) tiene menos de 8 caracteres, o si la cadena original tiene más de 72 caracteres, o si es nula/vacía/solo espacios, el sistema SHALL rechazar la solicitud con HTTP 400 y el usuario NO SHALL ser creado en la base de datos.

**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: Creación exitosa con contraseña válida

*Para cualquier* cadena `password` con al menos 8 caracteres no-espacio y un máximo de 72 caracteres totales, la creación de usuario SHALL tener éxito (HTTP 201) y el usuario SHALL existir en la BD con `estado_invitacion = 'Pendiente'` y un `password_hash` que coincida con la contraseña proporcionada via bcrypt compare.

**Validates: Requirements 1.4**

### Property 3: Ruteo basado en estado en login

*Para cualquier* usuario con credenciales válidas: si `estado_invitacion = 'Pendiente'`, el login SHALL retornar `{ status: 'requires_password_change', userId }` sin token; si `estado_invitacion = 'Aceptada'`, el login SHALL retornar `{ accessToken, user }` con un JWT válido.

**Validates: Requirements 2.1, 2.2**

### Property 4: Errores de credenciales son opacos al estado

*Para cualquier* combinación de email/password inválida, independientemente de si el usuario existe, de su `estado_invitacion` (`Pendiente`, `Aceptada`, `Expirada`), o de si tiene `password_hash`, el sistema SHALL retornar exactamente HTTP 401 con `{ error: 'invalid_credentials' }` sin revelar información adicional sobre el estado del usuario.

**Validates: Requirements 2.3, 2.4**

### Property 5: Transición de estado en cambio de contraseña de primer login

*Para cualquier* usuario en estado `'Pendiente'` con `currentPassword` correcta y `newPassword` válida (8-72 chars, diferente de currentPassword), el endpoint SHALL: actualizar el hash en BD, cambiar `estado_invitacion` a `'Aceptada'`, y retornar un `accessToken` JWT válido. Posterior a esto, el login normal con `newPassword` SHALL producir un token.

**Validates: Requirements 3.1**

### Property 6: Validación de newPassword en endpoint de primer login

*Para cualquier* cadena `newPassword` que sea vacía, nula, solo espacios, menor a 8 caracteres, mayor a 72 caracteres, o idéntica a `currentPassword`, el endpoint de primer login SHALL rechazar la solicitud con HTTP 400 y el `estado_invitacion` del usuario NO SHALL cambiar.

**Validates: Requirements 3.3, 3.5, 5.5**

### Property 7: Rechazo de usuarios ya activados

*Para cualquier* usuario con `estado_invitacion = 'Aceptada'` que intente usar el endpoint de cambio de contraseña de primer login, el sistema SHALL responder con HTTP 403 independientemente de si las credenciales son válidas.

**Validates: Requirements 3.4**

### Property 8: Limpieza de sesiones al cambiar contraseña

*Para cualquier* cambio de contraseña exitoso en el endpoint de primer login, TODAS las sesiones de refresh previas asociadas al `userId` en la tabla SESSIONS SHALL ser eliminadas antes de crear la nueva sesión.

**Validates: Requirements 5.2**

### Property 9: Rate limiting del endpoint de primer login

*Para cualquier* `userId`, si se realizan más de 5 intentos fallidos de cambio de contraseña dentro de una ventana de 15 minutos, el intento número 6 y subsiguientes SHALL ser rechazados con HTTP 429, independientemente de si las credenciales son correctas.

**Validates: Requirements 5.4**

### Property 10: Validación de formulario en modal

*Para cualquier* par de valores `(newPassword, confirmPassword)` donde no coincidan, o donde alguno sea vacío/solo espacios, el botón de envío del Modal_Cambio_Contraseña SHALL permanecer deshabilitado. Únicamente cuando ambos coinciden y tienen contenido no-espacio, el botón SHALL habilitarse.

**Validates: Requirements 4.3, 4.4**

## Error Handling

### Backend

| Escenario | Acción |
|-----------|--------|
| Error de conexión a BD durante login/password-change | HTTP 500 con `{ error: 'internal_error' }`. No revelar detalles en producción. |
| bcrypt.compare falla (hash corrupto) | Tratar como contraseña inválida (401). Log interno del error. |
| Error al crear refresh session | HTTP 500. Rollback: no actualizar estado si no se puede emitir token. |
| userId manipulado (no numérico) | Parsear con `Number()`, si NaN → HTTP 400 `'invalid_user_id'` |
| Rate limit store llena (memory concern) | Limpiar entradas expiradas en cada verificación. En producción considerar migración a Redis. |

### Frontend

| Escenario | Acción |
|-----------|--------|
| Timeout en POST /auth/first-login-password | Mostrar "Error de conexión. Intente nuevamente." en el modal |
| Error de red (offline) | Mostrar "Sin conexión a internet." en el modal |
| Respuesta inesperada (status no documentado) | Mostrar "Error inesperado. Contacte al administrador." |
| Token recibido pero decodificación falla | Logout y mostrar error genérico |

## Testing Strategy

### Tests Unitarios (Jest — existente)

- **authController.login():** Verificar detección de estado Pendiente, Aceptada, Expirada con mocks de pool.execute
- **authController.firstLoginPasswordChange():** Verificar cada caso de error (400, 401, 403, 404, 429) y caso exitoso
- **userController.createUser():** Verificar nuevas validaciones de password
- **ChangePasswordModal:** Tests con React Testing Library para estados del formulario, botón deshabilitado, envío, errores
- **Login.jsx:** Verificar que la respuesta `requires_password_change` activa el modal

### Tests de Propiedad (fast-check + Jest)

La lógica de validación de contraseñas y el flujo de estado son ideales para property-based testing:

- **Librería:** `fast-check` (generador de datos random para JS/Node.js)
- **Configuración:** Mínimo 100 iteraciones por test
- **Tag format:** `Feature: first-login-password-change, Property N: <descripción>`

Tests de propiedad a implementar:
1. Validación de longitud de contraseña en createUser (Propiedad 1 y 2)
2. Ruteo basado en estado en login (Propiedad 3)
3. Errores opacos al estado del usuario (Propiedad 4)
4. Transición de estado en primer login (Propiedad 5)
5. Validación de newPassword (Propiedad 6)
6. Rechazo de usuarios ya activados (Propiedad 7)
7. Rate limiting (Propiedad 9)
8. Validación de formulario del modal (Propiedad 10)

### Tests de Integración (Supertest — existente)

- Flujo completo: crear usuario → login → cambiar contraseña → login normal con nueva contraseña
- Verificar cookie refreshToken presente después del cambio exitoso
- Verificar que sesiones previas son invalidadas

### Decisiones de Diseño

| Decisión | Justificación |
|----------|---------------|
| Endpoint en `/auth/` y no en `/users/` | El cambio de contraseña de primer login es parte del flujo de autenticación, no de gestión de usuarios. No requiere JWT. |
| Rate limiting en memoria | El sistema es single-instance. Evita dependencia de Redis para un feature puntual. Si se escala, migrar. |
| Contraseña temporal pasada al modal via props (estado local de Login.jsx) | Evita almacenar la contraseña temporal en localStorage/sessionStorage donde podría ser leída por XSS. Se mantiene solo en memoria durante la sesión del modal. |
| No modificar esquema de BD | El campo `estado_invitacion` ya tiene los valores necesarios. No se requieren migraciones. |
| Eliminar TODAS las sessions al cambiar password | Invalidar cualquier sesión previa (por si el admin u otro dispositivo tenía una sesión). Principio de seguridad: nuevo password = nuevo inicio limpio. |
| bcrypt cost factor 10 | Ya usado en el sistema. Mantener consistencia. |
