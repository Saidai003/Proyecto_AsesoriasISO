# Documentación Interna de Desarrollo

> ⚠️ Este archivo NO debe subirse al repositorio. Está incluido en `.gitignore`.

## Usuarios de demostración

Los seeds crean cuentas de demostración (Las contrasenas no son estas... obviamente, de lo contrario, que seguridad tendria la plataforma?):

| Email | Contraseña | Rol |
|-------|-----------|-----|
| responsable@demo.local | 1234 | Responsable SGC |
| evaluador@demo.local | 1234 | Evaluador |
| admin@demo.local | 1234 | Admin |

## Variables de entorno

Copia `.env.example` → `.env` en la raíz:

| Variable | Desarrollo | Producción |
|----------|------------|------------|
| `NODE_ENV` | `development` | `production` |
| `JWT_SECRET` | valor de dev | **secreto fuerte** |
| `DB_PASSWORD` | `change_me` | **cambiar** |
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | **cambiar** |

## Importar seeds manualmente

Si la base ya existía sin seeds, el backend los aplica solo en el primer arranque. Para forzar desde cero:

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

Alternativa PowerShell:

```powershell
cmd /c "type .\seeds\*.sql" | docker compose exec -T mysql mysql --default-character-set=utf8mb4 -u root -prootpassword proyecto_iso
```

Verificar usuarios:

```powershell
docker compose exec mysql mysql -u root -prootpassword proyecto_iso -e "SELECT id,email,nombre,role_id,workspace_id FROM USUARIOS;"
```

## Autorización Google Drive

URL de autorización OAuth:

```
https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&prompt=consent&response_type=code&client_id=676648574880-9p7letlq1kd3cgb6rr44m243dis741vd.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fgoogle-drive%2Fcallback
```

Endpoints locales:

- `GET http://localhost:3000/google-drive/auth` → redirige a Google
- `GET http://localhost:3000/google-drive/authurl` → `{ "url": "https://..." }`
- `POST http://localhost:3000/google-drive/token` → intercambiar `code` por tokens

Para iniciar el flujo OAuth desde PowerShell:

```powershell
Start-Process (Invoke-RestMethod 'http://localhost:3000/google-drive/authurl').url
```

Verificar estado: `GET http://localhost:3000/google-drive/status` → `{"authorized":true}`

Con `NODE_ENV=production`, las evidencias en Google Drive se guardan bajo la subcarpeta **Production** (en desarrollo, **Development**). Ver `backend-js/GOOGLE_DRIVE_README.md`.

## Nota sobre el esquema `drive://`

Si en la UI aparece un `url_archivo` con formato `drive://<FILE_ID>`, el navegador dará error `ERR_UNKNOWN_URL_SCHEME`. Usar el endpoint de descarga del backend:

```
GET /api/evidencias/:id/download
```

## Nota sobre el error `SET NAMES`

Si algún cliente arroja error con `SET NAMES utf8mb4;`, sustituir por:

```sql
/*!40101 SET NAMES utf8mb4 */;
```

O importar con `--default-character-set=utf8mb4`.

## Notas técnicas del frontend

- **Forms:** Se usa `react-hook-form` para formularios.
- **Navegación:** Se usa `useNavigate` de `react-router-dom` (no `window.location.href`).
- **Actualización de estado funcional:** `setState(prev => ({ ...prev, [key]: value }))` para evitar condiciones de carrera.
