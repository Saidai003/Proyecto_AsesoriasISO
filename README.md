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
