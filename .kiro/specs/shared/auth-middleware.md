# Autenticación y Autorización — Middleware compartido

**Archivo:** `backend-js/src/middleware/auth.js`

Este middleware se usa en todas las rutas protegidas del sistema. Se documenta aquí una sola vez para evitar repetición.

---

## requireAuth

Verifica que el request incluya un JWT válido en el header `Authorization: Bearer <token>`.

```javascript
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthenticated' });
  const token = auth.slice(7);
  try {
    req.user = verifyAccessToken(token);  // Decodifica y adjunta { id, email, role, workspace_id }
    return next();
  } catch(err) {
    return res.status(401).json({ error: 'invalid_token' });
  }
}
```

**Comportamiento:**
- Sin header → `401 unauthenticated`
- Token inválido o expirado → `401 invalid_token`
- Token válido → adjunta `req.user` con el payload decodificado y continúa

---

## requireRole(roleName)

Verifica que el usuario autenticado tenga un rol específico.

```javascript
function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (req.user.role !== roleName && req.user.role !== 'Admin') return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
```

**Regla clave:** El rol `Admin` siempre pasa cualquier `requireRole` (bypass explícito).

---

## requireRoles(...roles)

Variante que acepta múltiples roles permitidos.

```javascript
function requireRoles(...roles) {
  const allowed = Array.isArray(roles[0]) ? roles[0] : roles;
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (allowed.includes(req.user.role) || req.user.role === 'Admin') return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}
```

---

## Uso típico en rutas

```javascript
// Solo Admin
router.get('/', requireAuth, requireRole('Admin'), handler);

// Evaluador o Responsable (Admin también pasa)
router.put('/:id', requireAuth, requireRoles('Evaluador', 'Responsable SGC'), handler);
```

---

## Payload del JWT (req.user)

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
