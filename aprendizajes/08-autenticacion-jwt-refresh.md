# Autenticación JWT + Refresh Token

## Concepto

La plataforma usa un esquema **dual** para balancear seguridad con experiencia de usuario:

- **Access Token (JWT)**: stateless, 30 minutos, viaja en el header Authorization
- **Refresh Token (UUID)**: almacenado en DB + cookie HttpOnly, 24 horas, revocable

## Por qué dos tokens

Un JWT no se puede "invalidar" una vez emitido (es stateless). Opciones:
1. JWT corto (30min) para minimizar el daño si se compromete
2. Refresh token en DB para poder revocar sesiones (logout, cambio de password)
3. Cookie HttpOnly para que JavaScript no pueda robar el refresh (XSS-safe)

## Flujo completo

```
Login exitoso:
  → Backend genera JWT (30min) + UUID refresh (24h en tabla SESSIONS)
  → JWT va en body de respuesta → frontend lo guarda en localStorage
  → Refresh va en Set-Cookie: HttpOnly → browser lo gestiona automáticamente

Cada request:
  → Frontend adjunta: Authorization: Bearer <JWT>
  → Backend middleware verifica JWT → si válido, continúa

JWT expira (cada 30min):
  → Frontend recibe 401
  → fetchWithAuth automáticamente hace POST /auth/refresh (cookie se envía sola)
  → Backend busca token en SESSIONS, si válido → genera nuevo JWT
  → Frontend retry del request original con nuevo JWT (transparente)

Logout:
  → Backend: DELETE FROM SESSIONS WHERE token = ? + clearCookie
  → Frontend: limpia localStorage
```

## Seguridad de la cookie

```javascript
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,       // JS del browser NO puede leerla → protege contra XSS
  sameSite: 'strict',   // No se envía en requests cross-origin → protege contra CSRF
  secure: cookieSecure, // Solo HTTPS en producción
  maxAge: ...,          // 24h
  path: '/'             // Disponible en toda la app
});
```

## Auto-refresh en el frontend (AuthContext.jsx)

El frontend programa un `setTimeout` 60 segundos antes de que expire el JWT:

```
1. Decodifica JWT → extrae claim 'exp'
2. Calcula: milliseconds = (exp * 1000) - Date.now() - 60000
3. setTimeout(doRefresh, milliseconds)
4. Si usuario está idle (react-idle-timer) → pausa el refresh
5. Si refresh falla → limpia todo, redirige a /login
```

## Lo que NO es cifrado

- **bcrypt**: hashing (irreversible), no cifrado
- **JWT HS256**: firma HMAC (integridad), no cifra el payload
- **HTTPS/TLS**: cifra el transporte, no los datos en reposo
- **AES-256**: la plataforma NO lo implementa; Google Drive sí en sus servidores
