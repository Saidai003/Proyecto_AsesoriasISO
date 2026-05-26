Prueba de integración Google Drive (OAuth2) — Backend

Requisitos
- Tener `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` configurados en `backend-js/.env`.
- `GOOGLE_REDIRECT_URI` debe apuntar a `http://localhost:3000/google-drive/callback` (o la URL que registres en Google Cloud Console).

Pasos rápidos
1. Instalar dependencias:

```bash
cd backend-js
npm install
```

2. Añadir variables en `backend-js/.env`:

```
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/google-drive/callback
```

3. Iniciar servidor:

```bash
npm run dev
```

4. Obtener URL de autorización:
- Llamar: `GET http://localhost:3000/google-drive/authurl`
- Recomendado (PowerShell): obtener y abrir la URL automáticamente para evitar truncados o errores de copia/pega:

```powershell
Start-Process (Invoke-RestMethod 'http://localhost:3000/google-drive/authurl').url
```

- Alternativa: visitar `http://localhost:3000/google-drive/auth` (endpoint de conveniencia) que redirige directamente a la pantalla de consentimiento de Google.
- IMPORTANTE: no abras manualmente `http://localhost:3000/google-drive/callback` en el navegador; esa URL debe ser la target de la redirección de Google y solo contendrá `?code=...` después del consentimiento. Abrirla a mano produce `missing_code`.

Nota: hay una ruta de conveniencia que redirige directamente a la pantalla de consentimiento:

- Abre en el navegador: `http://localhost:3000/google-drive/auth`
	(evita truncados por copy/paste de la URL larga).

5. Guardar tokens automáticamente:
- Si registraste `GOOGLE_REDIRECT_URI` apuntando a `http://localhost:3000/google-drive/callback`, el servidor canjeará el `code` y guardará los tokens en `backend-js/.credentials/drive_token.json`.

Nota adicional: si el contenedor monta el archivo de token en modo solo-lectura (por ejemplo `./.env.drive_token:/app/.env.drive_token:ro`) el servidor fallará al intentar escribir el token y verás errores similares a:

```
callback token exchange failed [Error: EROFS: read-only file system, open '/app/.env.drive_token']
```

En ese caso, actualiza `docker-compose.yml` para remover `:ro` y permitir escritura por parte del contenedor.
- Alternativa: si no quieres usar redirect, copia el `code` y haz `POST /google-drive/token` con JSON `{ "code": "EL_CODE" }`.

Ejemplo verificado: al completar el flujo el servidor guarda el archivo `/app/.credentials/drive_token.json` dentro del contenedor. Para inspeccionarlo desde el host:

```powershell
docker compose exec backend-js sh -c "ls -la /app/.credentials && cat /app/.credentials/drive_token.json"
```

Si prefieres ejecutar tests localmente, copia el token desde el contenedor al host:

```powershell
# sustituye <container> por el nombre mostrado por `docker compose ps`
docker cp <container>:/app/.credentials/drive_token.json backend-js/.credentials/drive_token.json
```

6. Verificar estado:
- GET `http://localhost:3000/google-drive/status` → `{ "authorized": true }` cuando los tokens estén guardados.

Carpeta destino para subidas

Si quieres que los archivos subidos se guarden en una carpeta específica de tu Google Drive, establece una de las siguientes variables en `backend-js/.env`:

```
GOOGLE_DRIVE_FOLDER_ID=1EarK3UR6Obn_vQCFlMK-bsXZQe8TGYd6
```

El servicio usará `GOOGLE_DRIVE_FOLDER_ID` como carpeta raíz donde crear subcarpetas por cada `workspace` y subir los archivos ahí. También puedes pasar `parents` como parámetro al llamar a la función de subida desde tu propio código.

Notas
- Los tokens se guardan en `backend-js/.credentials/drive_token.json`. No versionar este archivo.
- El upload de evidencias intentará usar Google Drive; si falla, hará fallback a `uploads/`.
- Para producción, revisa permisos y consideraciones de seguridad (encriptar tokens, uso de cuentas de servicio si aplica, restringir `anyone` permission).

Docker notes
- `docker-compose.yml` incluye `env_file: backend-js/.env` para cargar tus credenciales al servicio `backend-js`.
- Si actualizas `backend-js/.env`, reconstruye/recrea el servicio:

```powershell
docker compose up -d --build backend-js
```

Pruebas
- Para ejecutar pruebas unitarias e integraciones:

```bash
cd backend-js
npm install
```

- Ejecutar tests unitarios:

```bash
npm test
```

- Tests de integración (requieren credenciales y token):

```bash
# Habilitar integración y ejecutar
RUN_DRIVE_INTEGRATION=1 npm test
```

Tests dentro del contenedor (recomendado):

```powershell
docker compose exec backend-js sh -c "npm install --include=dev && RUN_DRIVE_INTEGRATION=1 npx jest tests/driveService.integration.test.js --runInBand --verbose"
```

Referencias
- Quickstart Node.js: https://developers.google.com/drive/api/v3/quickstart/nodejs
- OAuth2 overview: https://developers.google.com/identity/protocols/oauth2
