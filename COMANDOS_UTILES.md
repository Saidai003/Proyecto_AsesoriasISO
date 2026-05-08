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

Credenciales de prueba (seed):

- Admin: `admin@demo.local` / `Password123!`
- Evaluador: `evaluador@demo.local` / `Password123!`
- Responsable SGC: `responsable@demo.local` / `Password123!`

Pasos rápidos para desarrollo local (Vite frontend + backend en localhost):

1. Levantar backend y base de datos con Docker Compose:

```powershell
docker-compose up --build -d
docker-compose logs -f backend-js
```

2. Levantar frontend en modo desarrollo (Vite) desde la carpeta `frontend`:

```powershell
cd frontend
npm install

npm run dev
```

3. Acceso y pruebas:

- Abrir `http://localhost:5173` (o la URL que indique Vite). Al acceder a `/lobby` sin sesión serás redirigido a `/login`.
- Iniciar sesión con una de las credenciales de prueba.
- Verificar endpoints protegidos con `curl` o PowerShell usando el `accessToken` como se indica arriba.

Depuración CORS (si ves errores de CORS en consola):

- Asegúrate de que el backend esté corriendo y que `DEV_ALLOWED_ORIGINS` incluya el origen del frontend (por defecto `http://localhost:5173,http://localhost:5174`).
- Reinicia el backend si cambias `ENV` o `cors.js`.
