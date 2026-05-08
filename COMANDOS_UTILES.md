# Comandos útiles (trazabilidad)

Breve colección de comandos para levantar, depurar y probar la plataforma en desarrollo.

- Levantar todos los servicios (MySQL, backend, frontend) con Docker Compose:

```bash
docker-compose up --build -d
```

- Ver logs del backend en tiempo real:

```bash
docker-compose logs -f backend-js
```

- Ejecutar seed (desarrollo) — PowerShell (Invoke-RestMethod):

```powershell
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/seed' -ContentType 'application/json' -Body '{"secret":"dev_seed_secret"}'
```

Alternativa con curl (Linux/macOS o curl.exe en Windows):

```bash
curl -X POST http://localhost:3000/seed -H "Content-Type: application/json" -d '{"secret":"dev_seed_secret"}'
```

- Login (obtener `accessToken`) — curl (ejemplo):

```bash
curl -c cookies.txt -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"Password123!"}'
```

PowerShell (Invoke-RestMethod) — obtiene objeto con `accessToken`:

```powershell
$response = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/auth/login' -ContentType 'application/json' -Body '{"email":"admin@demo.local","password":"Password123!"}'
$response.accessToken
```

- Usar `accessToken` para llamar endpoints protegidos:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:3000/api/users
```

Notas:
- Reemplaza `<ACCESS_TOKEN>` por el token JWT obtenido al loguearte.
- Estos comandos están pensados para desarrollo; en producción adapta variables, secretos y seguridad.
