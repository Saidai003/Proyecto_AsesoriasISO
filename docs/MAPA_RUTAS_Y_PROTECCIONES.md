# Mapa de rutas y protecciones

> Inventario basado en el código de `backend-js/src` al 22 de julio de 2026. Describe los middlewares declarados en las rutas y los controles adicionales visibles en los controladores; no sustituye pruebas de autorización por rol y workspace.

## Capas globales

Todas las rutas Express pasan, en este orden, por:

1. `express.json({ limit: '2000mb' })` — lectura de cuerpos JSON.
2. `devCors` — CORS de desarrollo; solo devuelve `Access-Control-Allow-Origin` para orígenes de `DEV_ALLOWED_ORIGINS` (por defecto `http://localhost:5173`).
3. `cookieParser()` — permite leer la cookie `refreshToken`.

`requireAuth` exige `Authorization: Bearer <JWT>`, verifica firma y vencimiento, y asigna el payload a `req.user`. Devuelve `401 unauthenticated` o `401 invalid_token` si falla.

`requireRole` acepta uno o mas roles y valida que `req.user.role` este incluido explicitamente. Admin solo accede cuando la ruta lo declara.

| Leyenda | Significado |
|---|---|
| Pública | No usa `requireAuth` en el router. |
| Auth | Usa `requireAuth`: JWT de acceso válido requerido. |
| Rol | Ademas de Auth, restringe por `requireRole`; Admin debe declararse explicitamente cuando corresponda. |
| Workspace | El controlador valida pertenencia al workspace o resuelve el workspace activo. |

## Autenticación — `/auth`

| Método y ruta | Protección declarada | Control adicional / observación |
|---|---|---|
| `POST /auth/login` | Pública | Valida credenciales bcrypt; emite JWT de 30 min y cookie de refresh. |
| `POST /auth/refresh` | Pública por diseño | Valida `refreshToken` HttpOnly contra `SESSIONS` y `expires_at`; emite JWT nuevo. |
| `POST /auth/logout` | Pública por diseño | Revoca la sesión identificada por la cookie si existe y limpia la cookie. |
| `POST /auth/first-login-password` | Pública por diseño | Valida contraseña temporal, tiene límite en memoria de 5 intentos/15 min por usuario y crea nueva sesión. |

## Usuarios y workspaces

| Método y ruta | Protección declarada | Control adicional / observación |
|---|---|---|
| `POST /api/users` | Auth + Rol: Admin | Crea usuario; contraseña bcrypt. |
| `GET /api/users` | Auth + Rol: Admin | Lista usuarios. |
| `GET /api/users/responsables` | Auth | Filtra por workspace para usuarios no admin con workspace. |
| `GET /api/users/:id` | Auth + Rol: Admin | Obtiene usuario. |
| `PUT /api/users/:id/password` | Auth | Solo permite que `req.user.id` coincida con `:id`. |
| `PUT /api/users/:id` | Auth + Rol: Admin | Actualiza usuario. |
| `DELETE /api/users/:id` | Auth + Rol: Admin | Elimina usuario. |
| `PUT /api/users/:id/workspace` | Auth + Rol: Admin | Asigna o quita workspace. |
| `GET /api/workspaces` | Auth + Rol: Admin | Lista workspaces. |
| `POST /api/workspaces` | Auth + Rol: Admin | Crea workspace y siembra evaluaciones. |
| `GET /api/workspaces/:id` | Auth + Rol: Admin | Obtiene workspace. |
| `PUT /api/workspaces/:id` | Auth + Rol: Admin | Actualiza workspace. |
| `DELETE /api/workspaces/:id` | Auth + Rol: Admin | Elimina workspace. |

## ISO, operación, evaluaciones y dashboards

| Método y ruta | Protección declarada | Control adicional / observación |
|---|---|---|
| `GET /api/isos` | Auth + Rol: Evaluador, Responsable SGC o Admin | Catalogo ISO. |
| `GET /api/isos/:id/tree` | Auth + Rol: Evaluador, Responsable SGC o Admin | Arbol ISO. |
| `GET /api/isos/requisitos/:id` | Auth + Rol: Evaluador, Responsable SGC o Admin | Subarbol de requisito. |
| `GET /api/evaluaciones/requisito/:id` | Auth + Rol: Evaluador, Responsable SGC o Admin | Obtiene o crea evaluacion para el workspace actual. |
| `PATCH /api/evaluaciones/:id` | Auth + Rol: Evaluador o Admin | Verifica que la evaluacion pertenezca al workspace. |
| `POST /api/evaluaciones/:id/auto-estado` | Auth + Rol: Evaluador, Responsable SGC o Admin | Verifica pertenencia antes de recalcular estado. |
| `GET /api/dashboards/admin` | Auth + Rol: Admin | Router aplica Auth globalmente. |
| `GET /api/dashboards/evaluator` | Auth + Rol: Evaluador | Router aplica Auth globalmente. |
| `GET /api/dashboards/responsible` | Auth + Rol: Responsable SGC | Router aplica Auth globalmente. |

## No conformidades y acciones

| Método y ruta | Protección declarada | Control adicional / observación |
|---|---|---|
| `POST /api/nc` | Auth + Rol: Evaluador o Admin | Crea NC asociada a evaluacion del workspace. |
| `DELETE /api/nc/:id` | Auth + Rol: Evaluador o Admin | `verifyWorkspaceAccess(..., 'nc', workspaceId)`. |
| `GET /api/nc/evaluacion/:id` | Auth | Verifica que la evaluación pertenezca al workspace. |
| `GET /api/nc/evaluacion/:id/hist` | Auth | Historial asociado a una evaluación; requiere revisión de pertenencia en pruebas. |
| `GET /api/nc/:id` | Auth | `JOIN` con `EVALUACION_REQUISITO` y filtro `workspace_id`. |
| `GET /api/nc/:id/hist` | Auth | Valida pertenencia de la NC antes de historial. |
| `PATCH /api/nc/:id` | Auth | Valida pertenencia de la NC antes de modificarla. |
| `GET /api/nc/:id/acciones` | Auth | Valida NC/workspace antes de listar acciones. |
| `POST /api/nc/:id/acciones` | Auth | Valida NC/workspace antes de crear acción. |
| `PATCH /api/acciones/:id` | Auth + Rol: Responsable SGC o Admin | Consulta con `JOIN` hasta evaluación y workspace. |
| `DELETE /api/acciones/:id` | Auth + Rol: Responsable SGC o Admin | Consulta con `JOIN` hasta evaluación y workspace. |
| `GET /api/acciones/hist` | Auth | Filtra por workspace si el usuario tiene uno. |
| `GET /api/acciones/evaluacion/:id` | Auth | `verifyWorkspaceAccess(..., 'evaluacion', workspaceId)`. |

## Evidencias, chat y notificaciones

| Método y ruta | Protección declarada | Control adicional / observación |
|---|---|---|
| `GET /api/evidencias/requisito/:id` | Auth | Resuelve evaluación por requisito + workspace y luego lista sus evidencias. |
| `GET /api/evidencias/:id/download` | Auth | `getEvidenceInWorkspace()` usa `JOIN` + workspace para no admin; después aplica permiso por rol/cargador. |
| `GET /api/evidencias/:id/history` | Auth | Usa búsqueda de evidencia con control de workspace. |
| `POST /api/evidencias` | Auth | Verifica que `evaluacion_requisito_id` pertenezca al workspace. |
| `PATCH /api/evidencias/:id` | Auth | `getEvidenceInWorkspace()` antes de modificar. |
| `DELETE /api/evidencias/:id` | Auth | `getEvidenceInWorkspace()` y permiso Admin o cargador. |
| `GET /api/chat?nc_id=?` | Auth | Exige exactamente un filtro (`nc_id` o `requisito_id`) y valida NC/workspace para usuarios con workspace. |
| `GET /api/chat?requisito_id=?` | Auth | Exige exactamente un filtro (`nc_id` o `requisito_id`) y valida evaluaci?n/workspace para usuarios con workspace. |
| `POST /api/chat` | Auth | Requiere `nc_id` o `requisito_id`; valida pertenencia cuando el usuario posee workspace. |
| `GET /api/notifications` | Auth | El controlador debe limitar resultados al usuario autenticado. |
| `PATCH /api/notifications/:id/read` | Auth | Requiere comprobar propiedad de la notificación en pruebas. |
| `POST /api/notifications/for-requisito/:id/clear` | Auth | Requiere comprobar pertenencia del requisito y de las notificaciones en pruebas. |

## Rutas sin autenticación declarada

| Método y ruta | Estado actual | Riesgo / uso esperado |
|---|---|---|
| `GET /` | Pública | Health/check simple: devuelve texto. |
| `POST /seed` | Auth + Rol: Admin | El controlador conserva una comprobaci?n adicional de `SEED_SECRET` fuera de desarrollo. |
| `GET /google-drive/authurl` | Auth + Rol: Evaluador o Responsable SGC | Entrega URL de autorizaci?n OAuth. |
| `GET /google-drive/auth` | Auth + Rol: Evaluador o Responsable SGC | Redirige a consentimiento Google OAuth. |
| `POST /google-drive/token` | Auth + Rol: Evaluador o Responsable SGC | Intercambia c?digo OAuth; los tokens permanecen solo en el servidor. |
| `GET /google-drive/callback` | Pública | Callback OAuth esperado; validar estado/flujo en despliegue. |
| `GET /google-drive/status` | Auth + Rol: Evaluador o Responsable SGC | Indica si existen tokens OAuth guardados. |
| `GET /uploads/*` | Auth | `express.static` exige JWT; la autorizaci?n por evidencia/workspace se realiza mediante el endpoint de descarga. |

## WebSocket — `/ws`

| Conexión | Protección | Observación |
|---|---|---|
| `ws://…/ws?token=<JWT>&nc_id=…` | JWT opcional en query + control de workspace | Para suscribirse a una NC requiere JWT válido y pertenencia al workspace. |
| `ws://…/ws?token=<JWT>&requisito_id=…` | JWT opcional en query + control de workspace | Igual para una evaluación. |
| `ws://…/ws` sin sala | Solo Admin | Usuarios no admin se cierran con código `4003`. |

## Hallazgos que conviene no sobreafirmar

1. No documentar que “todas las queries usan JOIN y workspace”: hay validaciones previas, consultas posteriores por ID y excepciones de Admin.
2. Chat exige ahora exactamente uno entre `nc_id` y `requisito_id`; debe conservarse esta validaci?n en cambios futuros.
3. Seed, las operaciones administrativas de Google Drive y `/uploads` ya exigen autenticaci?n; el callback OAuth se mantiene p?blico por necesidad del protocolo.
4. `requireRole` requiere que todos los roles autorizados, incluido Admin cuando corresponda, esten declarados explicitamente en la ruta.

