# Proyecto_AsesoriasISO

Repositorio inicial creado por asistente.

Estructura creada:

- `frontend/` — app React (Vite)
- `backend-js/` — API ejemplo con Express
- `backend-py/` — (eliminado) API ejemplo con FastAPI
- `db/init.sql` — script de inicialización MySQL
- `docker-compose.yml` — orquesta MySQL y backends de ejemplo

Para arrancar localmente con Docker:

```bash
docker compose up --build
```

Frontend: entrar en `frontend/` y ejecutar `npm install` y `npm run dev`.
Backend JS: entrar en `backend-js/` y ejecutar `npm install` y `npm run dev`.
Backend PY: eliminado; ya no es necesario.

Notas de frontend (actualizaciones importantes):

- **Forms:** El frontend ahora usa la librería `react-hook-form` (hook `useForm`) para manejar la mayoría de los formularios. Las páginas ya convertidas incluyen `src/pages/Login.jsx`, `src/pages/UsersManager.jsx`, `src/pages/WorkspacesManager.jsx` y `src/pages/ActivateAccount.jsx`.
- **Navegación / Redirecciones:** Hay algunos lugares donde se usa `window.location.href` (por ejemplo en [frontend/src/App.jsx](frontend/src/pages/Login.jsx) y [frontend/src/AuthContext.jsx](frontend/src/AuthContext.jsx)). Esa forma fuerza una recarga completa del DOM/JS y pierde el estado del cliente. Se recomienda usar `useNavigate` de `react-router-dom` o `<Link to="/...">` para navegación cliente-side (`const navigate = useNavigate(); navigate('/lobby')`), evitando recargas completas y manteniendo la app SPA.
- **Cambio aplicado:** Los usos relevantes de `window.location.href` en `App.jsx` y `AuthContext.jsx` han sido reemplazados por `useNavigate()` para realizar navegación cliente-side sin recargar la página.
- **Archivo de login:** No existe `login.js` en el proyecto; el componente de login está en [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx).

Si quieres, puedo reemplazar automáticamente los `window.location.href` por `useNavigate()` en los archivos relevantes.

- **Actualización aplicada:** Además de `App.jsx` y `AuthContext.jsx`, las vistas principales (`Lobby`, `UsersManager`, `WorkspacesManager`) ahora usan navegación cliente-side consistente: los `SideNav` en `UsersManager` y `WorkspacesManager` usan `Link` de `react-router-dom` y las vistas exponen `useNavigate()` para navegación programática cuando haga falta.

## Notas técnicas: actualizaciones de estado en React

En el frontend usamos patrones de actualización de estado basados en el `useState` de React. Un ejemplo frecuente es:

```js
setClausesByIso(prev => ({ [isoId]: data }));
```

Qué significa y por qué usarlo:
- `setClausesByIso` es la función `set` devuelta por `useState`.
- Pasar una función (`prev => ...`) es la forma recomendada para calcular el nuevo estado a partir del anterior (llamada "functional updates") — esto evita condiciones de carrera cuando se encolan múltiples actualizaciones.
- `[isoId]: data` utiliza "computed property names" de JavaScript para crear dinámicamente la clave del objeto según el valor de `isoId`.

Referencias oficiales:
- React — Functional updates / `useState`: https://react.dev/reference/react/useState#%3A~%3Atext%3Dset%2520functions%2C%20like%20setSomething(nextState)
- MDN — Computed property names (object initializer): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#computed_property_names

Uso seguro: si `clausesByIso` contiene otras claves que quieres preservar, usa la forma de fusión:

```js
setClausesByIso(prev => ({ ...prev, [isoId]: data }));
```

Esto mantiene las entradas previas y actualiza/añade solo la entrada para `isoId`.
