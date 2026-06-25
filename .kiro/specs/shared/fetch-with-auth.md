# Capa API — fetchWithAuth

**Archivo:** `frontend/src/lib/api.js`

Wrapper sobre `fetch` nativo que maneja automáticamente la autenticación JWT y el flujo de refresh. Reemplaza a `fetch` en toda la aplicación.

---

## Responsabilidades

1. **Adjunta token:** Agrega `Authorization: Bearer <token>` de `localStorage` a cada request.
2. **Refresh preventivo:** Si no hay token en localStorage, intenta refresh antes del request.
3. **Retry en 401:** Si el backend responde 401, intenta `POST /auth/refresh` y reintenta el request original con el nuevo token.
4. **Workspace context:** Propaga el workspace activo como query param `?workspace=X` (para que el Admin pueda operar en contexto de un cliente).
5. **Evento de sincronización:** Emite `auth:refreshed` vía `CustomEvent` para que otros componentes se enteren del nuevo token.

---

## Firma

```javascript
export async function fetchWithAuth(input, init = {}) { ... }
export default fetchWithAuth
```

- `input`: ruta relativa (ej: `/api/workspaces`) o URL completa
- `init`: opciones estándar de fetch (method, body, headers, etc.)
- Retorna: `Response` (igual que fetch nativo)

---

## Flujo interno

```
1. Determinar API_BASE (vacío en dev para usar Vite proxy, URL completa en prod)
2. Adjuntar ?workspace=X si hay workspace activo en sessionStorage
3. Leer token de localStorage
4. Si no hay token → POST /auth/refresh (con cookie) → guardar nuevo token
5. Ejecutar fetch con Authorization header
6. Si respuesta es 401:
   a. POST /auth/refresh
   b. Si éxito → retry con nuevo token
   c. Si falla → retornar el 401 original
7. Retornar la respuesta
```

---

## Uso desde hooks

```javascript
// En cualquier custom hook:
import fetchWithAuth from '../lib/api'

const res = await fetchWithAuth('/api/workspaces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre_cliente: 'ACME' })
})
if (!res.ok) throw await res.json()
const data = await res.json()
```

---

## Por qué no se usa Axios 

- Evita dependencia adicional.
- El wrapper es ~80 líneas y cubre exactamente lo necesario.
- Control total sobre el flujo de refresh sin magia de interceptores.
