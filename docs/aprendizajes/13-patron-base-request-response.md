# Patrón Base Request-Response de la Plataforma

> **Fecha:** 29/06/2026  
> **Contexto:** Documentar el patrón repetitivo que siguen todas las operaciones CRUD/update de la plataforma

---

## El patrón

Toda operación que modifica o consulta datos sigue este flujo idéntico:

```
[Frontend: Componente React]
    │
    │  1. Usuario interactúa (click, submit, etc.)
    │  2. Se construye un body/payload con los datos
    │  3. fetchWithAuth(endpoint, { method, headers, body })
    │     └── fetchWithAuth agrega JWT automáticamente
    │         si recibe 401, renueva token y reintenta
    │
    ▼
[Backend: Express]
    │
    │  4. Express Router matchea método + ruta
    │     Ejemplo: router.patch('/:id', requireAuth, controllerFn)
    │
    │  5. Middleware requireAuth:
    │     - Extrae JWT del header Authorization
    │     - Verifica firma y expiración
    │     - Inyecta req.user con { id, role, workspace_id, ... }
    │     - Llama next() si ok, o res.status(401) si falla
    │
    │  6. Controller function:
    │     - Extrae params (req.params.id) y body (req.body)
    │     - Valida ownership/IDOR (JOIN con workspace_id del usuario)
    │     - Valida permisos por rol si aplica
    │     - Ejecuta queries (SELECT, INSERT, UPDATE, DELETE)
    │     - Inserta historial si corresponde (_HIST tables)
    │     - Crea notificaciones si corresponde
    │     - Responde res.json(data) o res.status(4xx/5xx).json({ error })
    │
    ▼
[Frontend: Componente React]
    │
    │  7. Recibe response
    │  8. Si res.ok:
    │     - Actualiza estado local (setState)
    │     - Muestra toast de éxito
    │  9. Si !res.ok:
    │     - Parsea error del body
    │     - Muestra toast de error con getErrorText()
    │ 10. Catch: errores de red → toast genérico
```

---

## Elementos fijos (fontanería que NO cambia entre features)

| Elemento | Ubicación | Qué hace |
|----------|-----------|----------|
| `fetchWithAuth` | `frontend/src/lib/api.js` | Wrapper de fetch que agrega JWT, maneja refresh en 401, agrega workspace header |
| `requireAuth` | `backend-js/src/middleware/auth.js` | Valida JWT, inyecta req.user |
| `showToast` | `frontend/src/lib/toast.js` | Muestra notificaciones de éxito/error |
| `getErrorText` | `frontend/src/lib/errorMessage.js` | Extrae mensaje legible de error responses |
| React Router | `frontend/src/App.jsx` | Define qué componente renderizar por URL |
| Express Router | `backend-js/src/routes/*.js` | Define qué controller ejecutar por método+ruta |

---

## Elementos variables (lo que cambia entre features)

| Elemento | Qué cambia |
|----------|-----------|
| Endpoint | `/api/nc/:id`, `/api/acciones/:id`, `/api/evidencias/:id`, etc. |
| Método HTTP | GET, POST, PATCH, DELETE según operación |
| Body/payload | Campos específicos de cada entidad |
| Validaciones del controller | Reglas de negocio propias (roles, estados permitidos, campos obligatorios) |
| Tablas afectadas | Tabla principal + _HIST + NOTIFICACIONES según feature |
| Respuesta | El objeto actualizado/creado, o lista de objetos |

---

## Protección IDOR (siempre presente)

Todas las operaciones que acceden a datos validan que el recurso pertenece al workspace del usuario autenticado. Se hace con un JOIN:

```sql
SELECT x.* FROM TABLA x
JOIN ... ON ... 
WHERE x.id = ? AND ?.workspace_id = ?
```

Si no matchea, devuelve 404 (no 403, para no revelar existencia del recurso).

---

## Cuándo algo se sale del patrón (señales de alerta)

- Un endpoint no tiene `requireAuth` → posible agujero de seguridad
- Un controller no valida workspace/IDOR → posible acceso cross-tenant
- Un setState se hace sin verificar `res.ok` → UI puede quedar en estado inconsistente
- Un try/catch está vacío o solo tiene console.error → error silenciado que puede ocultar bugs
- Un fetch no tiene manejo de error → crash silencioso en red inestable
