# Design: HU-SEG-LOGIN - Inicio de Sesión Seguro

## Architecture

### Patrón general

```
Login.jsx → AuthContext.login() → POST /auth/login → authController.login()
                                                         ↓
                                                    signAccessToken() + createRefreshSession()
                                                         ↓
                                                    Response: { accessToken, user } + Set-Cookie: refreshToken

Protected.jsx → verifica token/user → fetchWithAuth → Bearer token en header
                                                         ↓
                                                    requireAuth middleware → verifyAccessToken()

Auto-refresh → AuthContext.scheduleRefresh() → POST /auth/refresh → nuevo accessToken
```

### Archivos involucrados

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Auth core | `backend-js/src/auth.js` | signAccessToken, verifyAccessToken, createRefreshSession, revokeRefreshSession, getSession |
| Controller | `backend-js/src/controllers/authController.js` | login, refresh, logout, firstLoginPasswordChange |
| Rutas | `backend-js/src/routes/auth.js` | POST /login, /refresh, /logout |
| Middleware | `backend-js/src/middleware/auth.js` | requireAuth, requireRole, requireRoles |
| Contexto | `frontend/src/AuthContext.jsx` | Estado global de auth, auto-refresh, idle detection |
| Página | `frontend/src/pages/Login.jsx` | Formulario email + password |
| Guard | `frontend/src/components/Protected.jsx` | Redirección si no autenticado |
| API layer | `frontend/src/lib/api.js` | fetchWithAuth con auto-retry en 401 |

## Components and Interfaces

### Endpoints REST

| Método | Ruta | Auth | Controller | Descripción |
|--------|------|------|------------|-------------|
| POST | `/auth/login` | No | login | Autenticar con email+password |
| POST | `/auth/refresh` | Cookie | refresh | Renovar access token |
| POST | `/auth/logout` | Cookie | logout | Revocar sesión |

### Controller: login

1. Validar email + password presentes → 400
2. Validar formato email → 400
3. Normalizar email (lowercase, trim)
4. SELECT usuario por email
5. Si no existe → bcrypt dummy compare + 401 (timing attack mitigation)
6. bcrypt.compare(password, hash) → 401 si falla
7. Si estado = 'Pendiente' → 200 `{ status: 'requires_password_change', userId }`
8. Si estado = 'Expirada' → 401
9. Si no tiene workspace y no es Admin → 403
10. Resolver nombre del rol desde tabla ROLES
11. signAccessToken({ id, email, role, workspace_id }) → JWT 30min
12. createRefreshSession(user.id) → UUID en tabla SESSIONS
13. Set-Cookie refreshToken (httpOnly, sameSite strict, secure en prod)
14. Retornar `{ accessToken, user: { id, nombre, email, role, workspace_id } }`

### Controller: refresh

1. Leer cookie refreshToken
2. Si no existe → 401
3. getSession(token) → buscar en SESSIONS donde expires_at > NOW()
4. Si no existe → limpiar cookie + 401
5. SELECT usuario por session.user_id
6. Resolver rol
7. signAccessToken → nuevo JWT
8. Retornar `{ accessToken }`

### Controller: logout

1. Leer cookie refreshToken
2. revokeRefreshSession(token) → DELETE FROM SESSIONS
3. clearCookie('refreshToken')
4. Retornar `{ ok: true }`

### Frontend: AuthContext

**Estado:**
- `accessToken` — guardado en localStorage
- `user` — { id, email, role, workspace_id }, guardado en localStorage
- `actingWorkspace` — workspace activo (Admin), guardado en sessionStorage
- `initializing` — true durante la verificación inicial de sesión

**Auto-refresh:**
- Decodifica JWT para obtener `exp`
- Programa setTimeout 60s antes del vencimiento
- Si el usuario está idle (react-idle-timer), pausa el refresh
- Si el refresh falla, limpia estado y redirige a login

**Flujo de inicialización:**
1. Al montar AuthContext, verifica si hay accessToken en localStorage
2. Si hay token, decodifica y restaura user
3. Si no hay token, intenta refresh via cookie
4. Si refresh falla, queda deslogueado (initializing = false)

## Data Models

### Tabla SESSIONS

```sql
CREATE TABLE SESSIONS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES USUARIOS(id) ON DELETE CASCADE
)
```

### JWT Payload

```json
{
  "id": 1,
  "email": "admin@demo.local",
  "role": "Admin",
  "workspace_id": 1,
  "iat": 1719000000,
  "exp": 1719001800
}
```

### Cookie refreshToken

```
Set-Cookie: refreshToken=<uuid>; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=86400
```

## Error Handling

| Situación | HTTP | Código | Acción frontend |
|-----------|------|--------|-----------------|
| Campos faltantes | 400 | `email_and_password_required` | Mostrar error |
| Email inválido | 400 | `invalid_email_format` | Mostrar error |
| Credenciales incorrectas | 401 | `invalid_credentials` | Mostrar "Login failed" |
| Estado Pendiente | 200 | `requires_password_change` | Redirigir a /activate |
| Sin workspace (no-Admin) | 403 | `workspace_required` | Mostrar mensaje |
| Refresh token ausente | 401 | `no_refresh_token` | Limpiar + login |
| Refresh token expirado | 401 | `refresh_token_expired` | Limpiar + login |
| Error interno | 500 | `internal_server_error` | Mostrar error genérico |

## Testing Strategy

### Tests unitarios existentes

Archivo: `backend-js/pruebas/unitarias/authController.test.js`

- Login con credenciales válidas retorna accessToken + cookie
- Login con password incorrecta retorna 401
- Login con email inexistente retorna 401 (timing-safe)
- Login con estado Pendiente retorna requires_password_change
- Refresh con token válido retorna nuevo accessToken
- Refresh sin cookie retorna 401

## Correctness Properties

- El JWT nunca contiene el password ni el hash; solo datos de identidad y autorización.
- El refresh token es un UUID opaco; no codifica información del usuario.
- La comparación bcrypt siempre se ejecuta (incluso si el usuario no existe) para prevenir timing attacks.
- En producción, JWT_SECRET debe ser configurado obligatoriamente (throw si es default).
- El refresh token se invalida al hacer logout (no hay forma de reutilizarlo).
- La cookie HttpOnly impide acceso desde JavaScript del cliente (XSS-safe).
- SameSite=Strict previene envío de la cookie en requests cross-origin (CSRF-safe).
