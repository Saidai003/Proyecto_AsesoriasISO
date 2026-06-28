# HU-SEG-LOGIN: Inicio de Sesión Seguro

## Qué resuelve

Autenticación con email + contraseña. Mantiene sesiones activas con JWT + refresh token. Protege todas las rutas contra acceso no autorizado.

## Flujo paso a paso

### Login

```
[Usuario en /login]
    → Escribe email + contraseña
    → POST /auth/login
        → Normaliza email (lowercase, trim)
        → Busca usuario en DB
        → Si no existe → bcrypt dummy compare (previene timing attack) → 401
        → bcrypt.compare(password, hash) → 401 si falla
        → Si estado "Pendiente" → { status: 'requires_password_change' } → /activate
        → Si no tiene workspace (y no es Admin) → 403
        → Genera JWT (30min) { id, email, role, workspace_id }
        → Genera refresh UUID → tabla SESSIONS
        → Set-Cookie: refreshToken (HttpOnly, SameSite=Strict)
    → Frontend guarda accessToken en localStorage
    → Navega a /lobby
```

### Cada request posterior

```
fetchWithAuth adjunta: Authorization: Bearer <JWT>
    → middleware requireAuth verifica JWT
    → Si válido → adjunta req.user, continúa
    → Si 401 → fetchWithAuth intenta refresh → retry
```

### Auto-refresh (transparente)

```
AuthContext programa setTimeout 60s antes de exp:
    → POST /auth/refresh (cookie se envía automáticamente)
    → Backend busca token en SESSIONS
    → Si válido → nuevo JWT
    → Frontend reemplaza token, programa siguiente refresh

Si usuario idle → refresh se pausa
Si refresh falla → limpia todo, redirige a /login
```

### Logout

```
[Usuario en /settings → "Cerrar sesión"]
    → POST /auth/logout
        → DELETE FROM SESSIONS WHERE token = ?
        → clearCookie
    → Frontend limpia localStorage
    → Redirige a /login
```

## Dónde vive cada pieza

| Concepto | Archivo |
|----------|---------|
| Auth core (JWT, sessions) | `backend-js/src/auth.js` |
| Controller (login/refresh/logout) | `backend-js/src/controllers/authController.js` |
| Rutas | `backend-js/src/routes/auth.js` |
| Middleware | `backend-js/src/middleware/auth.js` |
| Contexto global | `frontend/src/AuthContext.jsx` |
| Página login | `frontend/src/pages/Login.jsx` |
| Guard de rutas | `frontend/src/components/Protected.jsx` |
| Wrapper API | `frontend/src/lib/api.js` (fetchWithAuth) |

## Seguridad

| Mecanismo | Protege contra |
|-----------|----------------|
| Cookie HttpOnly | XSS (JS no puede leer el refresh token) |
| SameSite=Strict | CSRF (cookie no viaja en requests cross-origin) |
| bcrypt dummy compare | Enumeración de usuarios (timing-safe) |
| JWT_SECRET obligatorio en prod | Tokens falsificados |

## Almacenamiento

| Dato | Dónde |
|------|-------|
| Access token (JWT 30min) | localStorage |
| Refresh token (UUID 24h) | Cookie HttpOnly + tabla SESSIONS |
| Datos del user | localStorage (copia decodificada del JWT) |
| Workspace activo (Admin) | sessionStorage |
