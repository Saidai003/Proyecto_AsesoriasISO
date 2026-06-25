# Registro de Decisiones de Arquitectura (ADR)

> **Proyecto:** Gestor GAP ISO 9001:2015  
> **Última actualización:** 25 de junio de 2026

---

## Índice

- [ADR-001: Arquitectura general del sistema](#adr-001-arquitectura-general-del-sistema)
- [ADR-002: Stack tecnológico backend](#adr-002-stack-tecnológico-backend)
- [ADR-003: Stack tecnológico frontend](#adr-003-stack-tecnológico-frontend)
- [ADR-004: Base de datos y esquema relacional](#adr-004-base-de-datos-y-esquema-relacional)
- [ADR-005: Estructura del árbol normativo ISO 9001:2015](#adr-005-estructura-del-árbol-normativo-iso-90012015)
- [ADR-006: Estrategia de autenticación y sesiones](#adr-006-estrategia-de-autenticación-y-sesiones)
- [ADR-007: Patrón de autorización basado en roles](#adr-007-patrón-de-autorización-basado-en-roles)
- [ADR-008: Infraestructura y despliegue con Docker](#adr-008-infraestructura-y-despliegue-con-docker)
- [ADR-009: Estrategia CORS y comunicación frontend-backend](#adr-009-estrategia-cors-y-comunicación-frontend-backend)
- [ADR-010: Patrón de capa API en el frontend (fetchWithAuth)](#adr-010-patrón-de-capa-api-en-el-frontend-fetchwithauth)
- [ADR-011: Siembra de datos (Seeding) para estructura ISO](#adr-011-siembra-de-datos-seeding-para-estructura-iso)
---

## ADR-001: Arquitectura general del sistema

**Estado:** Aceptada  
**HU afectadas:** Todas (decisión transversal)

### Contexto

Se necesita una plataforma web para gestionar el análisis GAP de la norma ISO 9001:2015, con enfoque mono-norma pero escalable a futuro.

### Decisión

Se adopta una arquitectura **cliente-servidor desacoplada** con tres componentes principales:

```
┌─────────────┐       HTTP/REST         ┌─────────────────┐       MySQL         ┌───────────┐
│  Frontend   │   ◄──────────────►      │   Backend API   │  ◄──────────────►   │    DB     │
│  (React)    │                         │   (Express.js)  │                     │  (MySQL)  │
│  Port 5173  │                         │   Port 3000     │                     │  Port 3306│
└─────────────┘                         └─────────────────┘                     └───────────┘
```

- **Frontend SPA** (Single Page Application) en React
- **Backend REST API** en Node.js/Express
- **Base de datos relacional** MySQL 8.0
- **Comunicación en tiempo real** vía WebSocket (ws) para notificaciones

### Consecuencias

- El frontend y backend pueden escalar y desplegarse de forma independiente.
- La comunicación es exclusivamente por API REST (JSON) + WebSocket para eventos.
- Se puede reemplazar el frontend sin afectar el backend y viceversa.

---

## ADR-002: Stack tecnológico backend

**Estado:** Aceptada  
**HU afectadas:** Todas (decisión transversal)

### Contexto

Se requiere un backend ligero y rápido de desarrollar para un MVP.

### Decisión

| Componente | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | 18 (Alpine) |
| Framework HTTP | Express | ^4.18.2 |
| Base de datos | mysql2/promise | ^3.22.1 |
| Autenticación | jsonwebtoken + bcryptjs | ^9.0.3 / ^2.4.3 |
| Almacenamiento externo | Google Drive API (googleapis) | ^128.0.0 |
| WebSocket | ws | ^8.21.0 |
| Variables de entorno | dotenv | ^16.6.1 |
| Cookies | cookie-parser | ^1.4.7 |
| Test runner | Jest + Supertest | ^29.6.0 / ^6.3.3 |

### Justificación

- Express es minimalista y permite control total sobre middlewares.
- `mysql2/promise` ofrece interfaz async/await nativa sin ORM, manteniendo las queries explícitas y auditables.
- No se usa ORM (como Sequelize o Prisma) para mantener control directo sobre las consultas SQL y facilitar la depuración.

### Estructura de archivos backend

```
backend-js/
├── src/
│   ├── index.js              # Entry point, startup sequence
│   ├── db.js                 # Pool de conexión MySQL
│   ├── auth.js               # Funciones JWT y sesiones
│   ├── middleware/
│   │   ├── auth.js           # requireAuth, requireRole, requireRoles
│   │   └── cors.js           # CORS configurable por ENV
│   ├── controllers/          # Lógica de negocio por dominio
│   ├── routes/               # Definición de rutas Express
│   └── services/             # Servicios (ws, drive, etc.)
├── seeds/                    # Scripts SQL de inicialización
├── scripts/                  # Utilidades (seed, tokens, etc.)
└── pruebas/                  # Tests unitarios e integración
```

---

## ADR-003: Stack tecnológico frontend

**Estado:** Aceptada  
**HU afectadas:** Todas (decisión transversal)

### Contexto

Se necesita una interfaz web reactiva y de rápido desarrollo.

### Decisión

| Componente | Tecnología | Versión |
|---|---|---|
| Librería UI | React | ^18.2.0 |
| Bundler/Dev server | Vite | ^5.0.0 |
| Routing | react-router-dom | ^6.14.1 |
| Formularios | react-hook-form | ^7.46.0 |
| Gráficos | chart.js + react-chartjs-2 | ^4.4.0 / ^5.2.0 |
| Estilos | Tailwind CSS | (via PostCSS) |
| Inactividad | react-idle-timer | ^5.7.3 |

### Justificación

- React 18 con Vite ofrece hot reload instantáneo y builds optimizados.
- `react-hook-form` maneja formularios con mínima re-renderización (crítico para formularios CRUD extensos).
- No se usa un state manager global (Redux/Zustand); el estado se gestiona con hooks locales + Context API, suficiente para el alcance del MVP.

### Patrón de arquitectura frontend

```
frontend/src/
├── pages/                # Vistas completas (una por ruta)
├── components/           # Componentes reutilizables
├── hooks/                # Custom hooks (lógica de dominio)
├── lib/                  # Utilidades (api.js, etc.)
├── AuthContext.jsx       # Contexto global de autenticación
└── App.jsx               # Router principal
```

---

## ADR-004: Base de datos y esquema relacional

**Estado:** Aceptada  
**HU afectadas:** Todas (decisión transversal)

### Contexto

El dominio requiere relaciones jerárquicas (norma → cláusula → requisito → subrequisito) y trazabilidad completa de cambios.

### Decisión

Se utiliza **MySQL 8.0** con esquema relacional de 7 niveles de dependencia:

```
Nivel 1 (Base):     ISOS, ROLES, ESPACIO_TRABAJO
Nivel 2:            CLAUSULAS, USUARIOS
Nivel 3:            REQUISITOS_BASE, SESIONES_USUARIO, SESSIONS, NOTIFICACIONES
Nivel 4:            EVALUACION_REQUISITO, PROCESOS, ACTIVIDAD_USUARIO
Nivel 5:            EVIDENCIAS, AUDITORIA_NC, AUDITORIA_NC_HIST
Nivel 6:            ACCIONES_CORRECTIVAS, CHAT_MESSAGES, EVIDENCIAS_LOG
Nivel 7:            ACCIONES_CORRECTIVAS_HIST
```

### Características del esquema

- **Charset UTF-8MB4** en todas las tablas (soporte completo de caracteres).
- **Foreign Keys con ON DELETE CASCADE** donde la eliminación en cascada es segura (evaluaciones de un workspace eliminado).
- **ON DELETE SET NULL** para preservar registros históricos cuando se elimina un usuario.
- **Tablas `_HIST`** para trazabilidad: `EVALUACION_REQUISITO_HIST`, `AUDITORIA_NC_HIST`, `ACCIONES_CORRECTIVAS_HIST`.
- **Pool de conexiones** con límite de 10 conexiones simultáneas y retry automático (8 intentos, 2s entre cada uno).

### Consecuencias

- No se usa ORM; las queries son explícitas y predecibles.
- Las migraciones se manejan con scripts SQL estáticos (no hay sistema de migraciones como Knex o Flyway).
- El esquema se inicializa una vez en el despliegue y los cambios se hacen manualmente.

---

## ADR-005: Estructura del árbol normativo ISO 9001:2015

**Estado:** Aceptada  
**HU afectadas:** HU-NAV-01, Alcance "Enfoque mono-norma"

### Contexto

La ISO 9001:2015 tiene una estructura jerárquica: Norma → Cláusulas (4-10) → Requisitos → Subrequisitos. Se necesita representarla fielmente en la base de datos.

### Decisión

Se modela con tres tablas en relación jerárquica con **autorreferencia**:

```sql
ISOS (id, nombre, descripcion)
  └── CLAUSULAS (id, iso_id FK, numero_clausula, titulo)
        └── REQUISITOS_BASE (id, clausula_id FK, requisito_padre_id FK→self, descripcion_normativa)
```

- `REQUISITOS_BASE.requisito_padre_id` referencia a sí misma (NULL = requisito raíz de la cláusula).
- Esto permite profundidad ilimitada: 5.1 → 5.1.1, 5.1.2, etc.

### Ejemplo del seed

```sql
-- Requisito padre
INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa)
VALUES (@CLAUSULA5_ID, NULL, '5.1 Liderazgo y compromiso');
SELECT LAST_INSERT_ID() INTO @REQ51_ID;

-- Subrequisitos hijos
INSERT INTO REQUISITOS_BASE (clausula_id, requisito_padre_id, descripcion_normativa) VALUES
(@CLAUSULA5_ID, @REQ51_ID, '5.1.1 Generalidades'),
(@CLAUSULA5_ID, @REQ51_ID, '5.1.2 Enfoque al cliente');
```

### Relación con evaluaciones por workspace

Cada workspace tiene su propia fila de evaluación por requisito:

```sql
EVALUACION_REQUISITO (id, requisito_base_id FK, workspace_id FK, estado_cumplimiento ENUM, ...)
```

Los requisitos base son **compartidos** entre todos los workspaces (son la norma); la evaluación es **por workspace** (es el estado de cumplimiento de cada cliente).

---

## ADR-006: Estrategia de autenticación y sesiones

**Estado:** Aceptada  
**HU afectadas:** HU-SEG-LOGIN, RF-AUTH-1, RF-AUTH-3

### Contexto

Se necesita un sistema de autenticación stateless pero con capacidad de revocar sesiones.

### Decisión

Se implementa un esquema **dual JWT + Refresh Token en DB**:

| Concepto | Implementación |
|---|---|
| Access Token | JWT firmado con HMAC (HS256), expira en 30 minutos |
| Refresh Token | UUID aleatorio (`crypto.randomUUID()`), almacenado en tabla `SESSIONS` |
| Almacenamiento del refresh | Cookie HttpOnly (no accesible por JS) |
| Almacenamiento del access | `localStorage` en el frontend |
| Revocación | `DELETE FROM SESSIONS WHERE token = ?` |
| Payload del JWT | `{ id, email, role, workspace_id }` |

### Flujo

```
1. Login → backend valida credenciales → genera JWT (30min) + refresh token (24h default)
2. Cada request → frontend envía JWT en header Authorization: Bearer <token>
3. JWT expira → frontend recibe 401 → intenta POST /auth/refresh (con cookie)
4. Si refresh válido → nuevo JWT + mismo refresh → retry automático del request original
5. Logout → backend elimina refresh token de DB + limpia cookie
```

### Seguridad

- En producción, `JWT_SECRET` debe configurarse obligatoriamente (throw si es default).
- Refresh token tiene vida configurable via `REFRESH_TOKEN_MINUTES` (default 1440 = 24h).
- La cookie es HttpOnly, Secure (en prod), SameSite.

---

## ADR-007: Patrón de autorización basado en roles

**Estado:** Aceptada  
**HU afectadas:** Roles y Privilegios (2.3), RF6

### Contexto

El sistema tiene tres roles con permisos diferenciados.

### Decisión

Tres roles fijos en la tabla `ROLES`:

| Rol | Capacidades principales |
|---|---|
| **Admin** | Gestión de workspaces, usuarios, acceso global a todos los espacios |
| **Evaluador** | Gestionar estados de brechas, aprobar/rechazar evidencias |
| **Responsable SGC** | Gestionar acciones correctivas, subir evidencias, cambiar estados operativos |

La autorización se implementa con middleware encadenado:

```javascript
// Uso típico en rutas:
router.get('/', requireAuth, requireRole('Admin'), handler);
router.put('/:id', requireAuth, requireRoles('Evaluador', 'Responsable SGC'), handler);
```

**Regla implícita:** El rol `Admin` siempre pasa cualquier `requireRole`/`requireRoles` (bypass hardcoded).

```javascript
function requireRole(roleName) {
  return (req, res, next) => {
    if (req.user.role !== roleName && req.user.role !== 'Admin') 
      return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
```

---

## ADR-008: Infraestructura y despliegue con Docker

**Estado:** Aceptada  
**HU afectadas:** Todas (decisión transversal)

### Contexto

Se necesita un entorno reproducible para desarrollo y despliegue.

### Decisión

Se utiliza **Docker Compose** con tres servicios:

```yaml
services:
  mysql:       # MySQL 8.0, puerto 3306, healthcheck con mysqladmin ping
  backend-js:  # Node 18 Alpine, puerto 3000, depende de mysql (healthy)
  frontend:    # Vite dev server, puerto 5173, depende de backend-js
```

### Estrategia de inicialización de DB

La base de datos se inicializa automáticamente mediante volúmenes montados en `/docker-entrypoint-initdb.d/`:

```
01-init.sql          → Esquema completo (CREATE TABLE IF NOT EXISTS)
02-seed-iso.sql      → Datos de la norma ISO 9001:2015
03-seed-users.sql    → Usuarios y workspace demo
```

El backend además tiene un `ensureSeed.js` que verifica en cada arranque si los seeds ya están aplicados.

### Secuencia de startup del backend

```
1. Esperar DB disponible (retry 60 intentos × 2s)
2. Ejecutar ensureSeed (idempotente)
3. Iniciar worker de notificaciones programadas
4. Levantar servidor HTTP + WebSocket
```

---

## ADR-009: Estrategia CORS y comunicación frontend-backend

**Estado:** Aceptada  
**HU afectadas:** Todas (decisión transversal)

### Contexto

Frontend y backend corren en puertos distintos (5173 vs 3000) durante el desarrollo.

### Decisión

CORS configurable por variable de entorno `DEV_ALLOWED_ORIGINS`:

```javascript
const allowed = (process.env.DEV_ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
// Solo se setea Access-Control-Allow-Origin si el origin está en la lista
// Credentials: true (necesario para cookies HttpOnly de refresh)
```

- En desarrollo: Vite proxy redirige `/api/*` al backend.
- En producción: se configuran los origins permitidos via ENV.

---

## ADR-010: Patrón de capa API en el frontend (fetchWithAuth)

**Estado:** Aceptada  
**HU afectadas:** Todas las que hacen requests al backend

### Contexto

Cada request necesita incluir el JWT y manejar la renovación automática cuando expira.

### Decisión

Se implementa un wrapper `fetchWithAuth` que reemplaza a `fetch` nativo:

```
1. Adjunta Authorization: Bearer <token> automáticamente
2. Si no hay token → intenta refresh antes del request
3. Si recibe 401 → intenta refresh → retry con nuevo token
4. Propaga workspace activo como query param (?workspace=X)
5. Emite evento 'auth:refreshed' para sincronizar otros componentes
```

### Justificación de no usar Axios

- Evita dependencia adicional.
- El wrapper es ~80 líneas y cubre exactamente lo necesario.
- Los interceptores de Axios serían equivalentes pero con más overhead.

---

## ADR-011: Siembra de datos (Seeding) para estructura ISO

**Estado:** Aceptada  
**HU afectadas:** Alcance "Carga de requisitos mediante seeding"

### Contexto

Originalmente se planteó carga dinámica de CSV para los requisitos de la norma. Fue descartado a favor de un seed estático.

### Decisión

La estructura completa de ISO 9001:2015 (cláusulas 4-10 con todos sus requisitos y subrequisitos) se inserta mediante un script SQL único (`seedISO_utf8.sql`) que:

1. Crea el registro en `ISOS` (ISO 9001:2015)
2. Inserta las cláusulas (4-10) en `CLAUSULAS`
3. Inserta los requisitos con sus jerarquías padre-hijo en `REQUISITOS_BASE`

Este seed se ejecuta una sola vez en el primer despliegue (idempotente via Docker initdb.d).

### Consecuencias

- No existe interfaz para modificar la estructura de la norma.
- Para soportar una nueva norma, se escribiría un nuevo script de seed.
- Esto simplifica enormemente el MVP y elimina riesgo de datos corruptos por carga manual.

---

*Este documento se reserva exclusivamente para decisiones arquitectónicas macro difíciles de revertir. Para la documentación técnica detallada de cada funcionalidad, ver `.kiro/specs/`.*
