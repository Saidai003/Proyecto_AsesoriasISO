# ProyectoISO

Descripción
-----------

Este repositorio contiene una aplicación para gestionar evidencias y requisitos ISO-9001.
Incluye un backend en Node.js (`backend-js`), una interfaz frontend con Vite/React (`frontend`) y una base de datos MySQL configurada con `docker-compose`.

Requisitos
----------

- Docker y Docker Compose
- Node.js (para desarrollo local si no se usa Docker)

Iniciar la aplicación
---------------------

**Un solo comando** (primera vez o reinicios posteriores):

```bash
docker compose up --build -d
```

En el **primer arranque** con volumen de base de datos vacío, MySQL ejecuta automáticamente en este orden:

1. `db/init.sql` — esquema
2. `seeds/seedISO_utf8.sql` — datos ISO
3. `seeds/seed_users_workspaces.sql` — workspace y usuarios demo

El backend además ejecuta `scripts/ensureSeed.js` al iniciar: si la tabla `ISOS` ya tiene datos, **no vuelve a aplicar seeds** (idempotente).

Variables de entorno (copia `.env.example` → `.env` en la raíz):

| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `NODE_ENV` | `development` | `production` |
| `JWT_SECRET` | valor de dev | **secreto fuerte** |
| `DB_PASSWORD` | `change_me` | **cambiar** |

Con `NODE_ENV=production`, las evidencias en Google Drive se guardan bajo la subcarpeta **Production** (en desarrollo, **Development**). Ver `backend-js/GOOGLE_DRIVE_README.md`.

Usuarios demo tras el seed: `responsable@demo.local`, `evaluador@demo.local`, `admin@demo.local` (contraseña `1234`).

Importar seeds manualmente (solo si hace falta)
-----------------------------------------------

Si la base ya existía sin seeds, el backend los aplica solo en el primer arranque detectado. Para forzar desde cero:

```bash
docker compose down -v
docker compose up --build -d
```

Comandos manuales alternativos (desarrollo):

1) Importar `seedISO_utf8.sql`:

```bash
docker compose exec -T mysql bash -lc "mysql --default-character-set=utf8mb4 -u root -prootpassword proyecto_iso" < seeds/seedISO_utf8.sql
```

2) Importar `seed_users_workspaces.sql`:

```bash
docker compose exec -T mysql bash -lc "mysql --default-character-set=utf8mb4 -u root -prootpassword proyecto_iso" < seeds/seed_users_workspaces.sql
```

Alternativa (concatenar ambos seed si tienes problemas con redirección en PowerShell):

```bash
cmd /c "type seeds\\seedISO_utf8.sql & type seeds\\seed_users_workspaces.sql" | docker compose exec -T mysql mysql --default-character-set=utf8mb4 -u root -prootpassword proyecto_iso
```

Nota sobre el error `SET NAMES`
-------------------------------

Algunos clientes o herramientas pueden arrojar este error al ejecutar directamente `SET NAMES utf8mb4;` dentro de un script SQL:

```
Syntax Error at line 2, column 4


SET NAMES utf8mb4;
	^^^             
Expected: paren_expr_list,'.',AND_OR,partition_extension_cla
dbtools
seed_users_workspaces.sql(2, 5): Syntax Error at line 2, column 4


SET NAMES utf8mb4;
^^^
Expected: paren_expr_list,'.',AND_OR,partition_extension_cla
```

Solución recomendada: sustituir la línea problemática por un comentario condicional compatible con MySQL, o simplemente ejecutar el script con el cliente `mysql` indicando el juego de caracteres. Ejemplo de sustitución en el archivo SQL:

```sql
/*!40101 SET NAMES utf8mb4 */;
```

O bien, importar el archivo usando `--default-character-set=utf8mb4` como se muestra en los comandos anteriores.

Usuarios de demostración
-----------------------

Los seeds crean cuentas de demostración (si no existen):

- responsable@demo.local (password `1234`)
- evaluador@demo.local (password `1234`)
- admin@demo.local (password `1234`)

Soporte
-------

Si quieres que importe los seeds por ti y verifique que las tildes y roles son correctos, indícamelo y lo ejecuto.

Autorización Google Drive
-------------------------

URL completa de autorización (útil para abrir directamente en el navegador):

https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&prompt=consent&response_type=code&client_id=676648574880-9p7letlq1kd3cgb6rr44m243dis741vd.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fgoogle-drive%2Fcallback

Version acotada / endpoints locales:

- Redirección al flujo OAuth (abre la pantalla de consentimiento):

	`GET http://localhost:3000/google-drive/auth`  -> redirige a la URL de Google

- Obtener la URL en JSON (útil para UI que muestre el enlace):

	`GET http://localhost:3000/google-drive/authurl`  -> { "url": "https://..." }

- Intercambiar `code` por tokens (si no usas callback):

	`POST http://localhost:3000/google-drive/token`  con JSON `{ "code": "<code>" }`

Nota sobre el esquema `drive://` y el error en el navegador
-------------------------------------------------------

Si en la UI aparece un `url_archivo` con formato `drive://<FILE_ID>` y al hacer clic el navegador da error como:

```
GET drive://1NBKr7ZLxdBb_5UrhZcZYahIgRlqYpN0b net::ERR_UNKNOWN_URL_SCHEME
```

esto ocurre porque `drive://` es un esquema interno que usamos para almacenar referencias a archivos en Google Drive, no es un URL HTTP válido que el navegador pueda abrir.

Soluciones recomendadas (elige una):

- Frontend: no enlazar directamente a `drive://...`. En su lugar, llamar al endpoint de descarga del backend que sirve el fichero desde Drive:

	`GET /api/evidencias/:id/download`

	Ese endpoint descarga el contenido desde Drive y devuelve el binario al navegador con `Content-Disposition` para forzar la descarga.

- Backend (opcional): si quieres permitir que el frontend reciba un enlace de vista segura, el backend puede obtener `webViewLink` de Drive y devolverlo **solo** a usuarios autorizados; ten en cuenta que ese enlace puede requerir permisos adicionales y puede exponer el archivo si no se controla.

Snippet sugerido para frontend (reemplazar enlaces `drive://` por llamada al download):

```js
// ejemplo: sustituir <a href={url_archivo}> por una función que llama al API
async function downloadEvidence(evidenceId){
	const res = await fetch(`/api/evidencias/${evidenceId}/download`, { credentials: 'include' })
	if(!res.ok) throw new Error('download failed')
	const blob = await res.blob()
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'evidencia'
	document.body.appendChild(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}
```

Después de autorizar con la URL proporcionada arriba, verifica `GET http://localhost:3000/google-drive/status` para confirmar que el backend tiene tokens guardados (`{"authorized":true}`).
Importante: no abras manualmente la URL de callback (`http://localhost:3000/google-drive/callback`) en el navegador; hacerlo producirá el error `missing_code` porque el parámetro `code` de OAuth2 solo está presente cuando Google redirige después del consentimiento. Para iniciar el flujo de manera segura desde PowerShell (recomendado en Windows), ejecuta:

```powershell
Start-Process (Invoke-RestMethod 'http://localhost:3000/google-drive/authurl').url
```

Este comando obtiene la URL completa de consentimiento de Google desde el backend y la abre en tu navegador. Completa la pantalla de consentimiento; Google redirigirá de nuevo a la `GOOGLE_REDIRECT_URI` registrada incluyendo `?code=...` para que el servidor pueda intercambiar y guardar tokens. Si previamente montaste el archivo de token como de solo lectura, el servidor no podrá persistir los tokens; asegúrate de que el contenedor del backend pueda escribir el archivo de token (ver `docker-compose.yml`).

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

## Seeding the database (tests / demo users)

To recreate the database from scratch and apply seeds, run these two commands first (stops and removes volumes, then rebuilds):

```powershell
docker compose down -v
docker compose up --build -d
```

If you need to populate the database with demo data (workspaces and test users), there's a prepared seed file: `seeds/seed_users_workspaces.sql`.

On Windows PowerShell (works on older versions too) run:

```powershell
cmd /c "type .\seeds\*.sql" | docker compose exec -T mysql mysql --default-character-set=utf8mb4 -u root -prootpassword proyecto_iso
```

Or, using a more PowerShell-native approach:

```powershell
$files = Get-ChildItem .\seeds\*.sql | Sort-Object Name
((Get-Content $files.FullName) -join "`n") | docker compose exec -T mysql mysql --default-character-set=utf8mb4 -u root -prootpassword proyecto_iso
```

The seed file creates a demo workspace, ensures `ROLES` entries and adds three demo users (password: `1234`, stored as bcrypt hash):

- responsable@demo.local — role: Responsable
- evaluador@demo.local — role: Evaluador
- admin@demo.local — role: Admin

Verify inserted users with:

```powershell
docker compose exec mysql mysql -u root -prootpassword proyecto_iso -e "SELECT id,email,nombre,role_id,workspace_id FROM USUARIOS;"
```

Seed file: [seeds/seed_users_workspaces.sql](seeds/seed_users_workspaces.sql#L1-L200)

