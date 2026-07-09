# ProyectoISO

Aplicación web para gestionar evidencias, auditorías y cumplimiento de requisitos ISO 9001:2015.

## Estructura

- `frontend/` — Interfaz React (Vite)
- `backend-js/` — API Node.js (Express)
- `seeds/` — Scripts SQL de inicialización
- `docker-compose.yml` — Orquestación de servicios

## Requisitos

- Docker y Docker Compose
- Node.js (solo para desarrollo local sin Docker)

## Inicio rápido

```bash
docker compose up --build -d
```

En el primer arranque, MySQL ejecuta los scripts de inicialización automáticamente y el backend aplica seeds de forma idempotente.

## Configuración

Copia `.env.example` → `.env` y configura las variables necesarias antes de iniciar.

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 5173 | App React con Vite |
| Backend | 3000 | API REST Express |
| MySQL | 3306 | Base de datos |

## Funcionalidades principales

- Gestión de requisitos ISO 9001:2015 (cláusulas 4–10)
- Evaluación de cumplimiento por workspace
- Dashboards con gráficos radar por cláusula
- Gestión de brechas (no conformidades) con flujo de estados
- Acciones correctivas y seguimiento
- Carga y validación de evidencias (integración Google Drive)
- Sistema de notificaciones
- Roles: Admin, Evaluador, Responsable SGC, Operativo

## Reiniciar desde cero

```bash
docker compose down -v
docker compose up --build -d
```

## Seeds de prueba

Para probar dashboards y flujos con datos de ejemplo, existen dos scripts de seed:

- `backend-js/scripts/seed_100_cumplimiento.js`: genera un escenario de cumplimiento total (100%) para el workspace 1.
- `backend-js/scripts/seed_50_cumplimiento.js`: genera un escenario parcial/realista con cumplimiento mixto, brechas abiertas y cerradas, y evidencias en distintos estados.

Ejecución desde la carpeta `backend-js`:

```bash
node scripts/seed_100_cumplimiento.js
node scripts/seed_50_cumplimiento.js
```

También se pueden ejecutar dentro del contenedor del backend:

```bash
docker compose exec backend-js node scripts/seed_100_cumplimiento.js
docker compose exec backend-js node scripts/seed_50_cumplimiento.js
```

Ambos scripts limpian los datos previos del workspace 1 y vuelven a insertarlos, por lo que conviene usarlos solo en entornos de prueba.

## Backups de base de datos

Puedes crear y restaurar backups de la base MySQL directamente desde la terminal. El script local `backend-js/scripts/dbBackup.js` queda fuera del repositorio y se guarda solo en tu entorno.

### Crear snapshots de referencia

```bash
mkdir -p backend-js/backups
docker compose exec -T -e MYSQL_PWD='change_me' mysql mysqldump -u proyecto_user --no-tablespaces --default-character-set=utf8mb4 proyecto_iso > backend-js/backups/backup_base.sql
```

```bash
docker compose exec backend-js node scripts/seed_50_cumplimiento.js
docker compose exec -T -e MYSQL_PWD='change_me' mysql mysqldump -u proyecto_user --no-tablespaces --default-character-set=utf8mb4 proyecto_iso > backend-js/backups/backup_cumplimiento_parcial.sql
```

```bash
docker compose exec backend-js node scripts/seed_100_cumplimiento.js
docker compose exec -T -e MYSQL_PWD='change_me' mysql mysqldump -u proyecto_user --no-tablespaces --default-character-set=utf8mb4 proyecto_iso > backend-js/backups/backup_cumplimiento_completo.sql
```

Si tu contraseña real es distinta, reemplaza `change_me` por la que uses en el proyecto.

### Restaurar un backup y reemplazar la base actual

```bash
docker compose exec -T mysql mysql -uroot -prootpassword -e "DROP DATABASE IF EXISTS proyecto_iso; CREATE DATABASE proyecto_iso;"
docker compose exec -T -e MYSQL_PWD='change_me' mysql mysql -u proyecto_user --default-character-set=utf8mb4 proyecto_iso < backend-js/backups/backup_base.sql
```

Para restaurar otro snapshot, cambia `backup_base.sql` por `backup_cumplimiento_parcial.sql` o `backup_cumplimiento_completo.sql`.

Los backups quedarán en `backend-js/backups/` y se pueden restaurar sobre la base actual con el comando anterior.

## Licencia

Proyecto académico — uso interno.
