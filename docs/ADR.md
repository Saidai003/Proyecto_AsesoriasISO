# Registro de Decisiones de Arquitectura (ADR)

> **Proyecto:** Gestor GAP ISO 9001:2015  
> **Última actualización:** 27 de junio de 2026

---

## Índice

- [ADR-001: Arquitectura cliente-servidor desacoplada](#adr-001-arquitectura-cliente-servidor-desacoplada)
- [ADR-002: Node.js + Express como backend](#adr-002-nodejs--express-como-backend)
- [ADR-003: React + Vite como frontend](#adr-003-react--vite-como-frontend)
- [ADR-004: MySQL sin ORM](#adr-004-mysql-sin-orm)
- [ADR-005: Árbol normativo con autorreferencia](#adr-005-árbol-normativo-con-autorreferencia)
- [ADR-006: JWT + Refresh Token en DB](#adr-006-jwt--refresh-token-en-db)
- [ADR-007: RBAC con middleware encadenado](#adr-007-rbac-con-middleware-encadenado)
- [ADR-008: Docker Compose para despliegue](#adr-008-docker-compose-para-despliegue)
- [ADR-009: fetchWithAuth en vez de Axios](#adr-009-fetchwithauth-en-vez-de-axios)
- [ADR-010: Seeding estático de la norma ISO](#adr-010-seeding-estático-de-la-norma-iso)
- [ADR-011: WebSocket para tiempo real](#adr-011-websocket-para-tiempo-real)

---

## ADR-001: Arquitectura cliente-servidor desacoplada

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

Se necesita una plataforma web para gestionar el análisis GAP de la norma ISO 9001:2015.
Debe soportar múltiples roles con vistas distintas, comunicación en tiempo real, y
almacenamiento de archivos.

### Decisión

Arquitectura de **3 capas desacopladas**: Frontend SPA + Backend API REST + Base de datos relacional.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Monolito SSR** (Next.js) | Menor complejidad de despliegue, SEO nativo | No se necesita SEO (app interna). El acoplamiento backend-frontend dificulta escalar o reemplazar capas de forma independiente. |
| **Microservicios** | Escalabilidad granular, despliegue independiente por servicio | Overhead excesivo para un MVP de 3 roles. Un solo equipo desarrolla todo; los microservicios aumentan complejidad operacional sin un beneficio claro. |
| **Serverless** (Lambda + API Gateway) | Sin servidores que mantener, escala automática | El dominio requiere WebSocket persistentes y un worker de notificaciones (setInterval). Serverless complica ambos. El equipo no tiene experiencia en AWS o GCP serverless. |


### Justificación

- Un MVP con 3 roles y ~14 módulos no justifica la complejidad de microservicios.
- La separación frontend/backend permite que el frontend se desarrolle con hot reload (Vite) sin reiniciar el backend.
- Si a futuro se necesita escalar, el backend REST puede ponerse detrás de un load balancer sin cambios.

---

## ADR-002: Node.js + Express como backend

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

Se necesita un backend que permita desarrollo ágil, soporte async I/O (DB + Google Drive), y sea familiar para el equipo.

### Decisión

Node.js 18 con Express 4, sin ORM, con mysql2/promise para acceso directo a la base de datos.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Python + FastAPI** | Typing nativo, documentación auto-generada (OpenAPI) | El equipo tiene mayor experiencia en JavaScript. Duplicar lenguajes (JS en frontend, Python en backend) aumenta el costo cognitivo. Se probó inicialmente pero se migró a JS. |
| **NestJS** (Node + TypeScript) | Estructura opinionada, inyección de dependencias, decoradores | Mayor boilerplate y curva de aprendizaje para un MVP. Express permite prototipar más rápido y el código resultante es más auditable línea a línea. |

### Justificación

- JavaScript full-stack reduce el cambio de contexto mental entre frontend y backend.
- Express es el framework más documentado de Node.js; cualquier problema tiene solución googleable.
- Sin ORM porque las queries del dominio son específicas (JOINs de 3-4 tablas, autorreferencia en requisitos). Un ORM oscurecería la lógica y complicaría el debug.

### Riesgos aceptados

- Sin TypeScript: se pierde type-safety. Mitigado con tests unitarios y validaciones explícitas en controllers, revisiones con IA y documentacion segun corresponda.
- Sin ORM: las migraciones de esquema son manuales. Mitigado con scripts SQL idempotentes.

---

## ADR-003: React + Vite como frontend

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

Se necesita una interfaz web reactiva con formularios complejos, tablas editables, y gráficos de radar.

### Decisión

React 18 + Vite + Tailwind CSS + react-hook-form + chart.js. Sin state manager global.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Vue 3 + Nuxt** | Sintaxis más simple, menor boilerplate | Ecosistema de componentes más pequeño. El equipo tiene más experiencia con React. |
| **Angular** | Framework completo (routing, forms, HTTP, DI integrados) | Excesivamente opinionado y pesado para un MVP. Curva de aprendizaje mayor. |
| **React + Redux** | State management predecible y centralizado | Para este MVP, el estado es local a cada página. Context API + hooks custom cubren el caso de auth global sin la ceremonia de Redux (actions, reducers, slices). |
| **React + CRA** | Setup zero-config | CRA está deprecado. Vite es más rápido (HMR instantáneo) y produce builds más livianos. |

### Justificación

- `react-hook-form` fue elegido sobre Formik porque no causa re-renders del formulario completo al escribir (crítico para las tablas con edición inline donde hay 6+ campos por fila).
- Tailwind fue elegido sobre Material UI o Ant Design porque permite diseño custom sin luchar contra estilos predefinidos. El diseño de la plataforma tiene identidad propia.
- Chart.js fue elegido sobre Recharts o D3 porque tiene soporte nativo de radar chart (requerido para el gráfico de araña del GAP).

---

## ADR-004: MySQL sin ORM

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

El dominio requiere relaciones jerárquicas (autorreferencia), trazabilidad (tablas _HIST), y consultas JOIN complejas con filtros dinámicos.

### Decisión

MySQL 8.0 con driver `mysql2/promise`. Queries SQL explícitas en los controllers. Sin ORM ni query builder.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **PostgreSQL** | JSON nativo, CTE recursivas más elegantes, extensiones avanzadas | MySQL es suficiente para este dominio. El equipo tiene más experiencia con MySQL. Docker Hub tiene imagen oficial bien mantenida. |
| **MongoDB** | Esquema flexible, documentos anidados naturales | El dominio es altamente relacional (requisitos → evaluaciones → evidencias → brechas → acciones). MongoDB forzaría denormalización excesiva o lookups que simulan JOINs mal. |
| **Sequelize/Prisma (ORM)** | Migraciones automáticas, type-safety, queries más legibles | Las queries de este proyecto son específicas: JOINs de 3-4 tablas para IDOR protection, autorreferencia para el árbol, INSERT...SELECT para seed de evaluaciones. Un ORM obscurecería estas queries y complicaría el debug. |
| **Knex (Query Builder)** | SQL explícito pero con builder fluent, migraciones | Ventaja marginal sobre raw queries con mysql2. Agrega dependencia sin beneficio claro para un equipo que ya sabe SQL. |

### Justificación

- Las queries son auditables línea por línea (importante para un proyecto de título donde la comisión puede preguntar "¿qué hace exactamente este endpoint?").
- Sin capa de abstracción entre el código y la DB, el debugging es directo: se copia la query al cliente MySQL y se prueba.
- Las tablas `_HIST` son simples INSERTs; no se necesita un sistema de event sourcing ni CDC.

### Riesgos aceptados

- Sin migraciones automáticas: los cambios de esquema requieren ALTER TABLE manuales. Mitigado con scripts idempotentes y el hecho de que el esquema está estable tras la fase de diseño.

---

## ADR-005: Árbol normativo con autorreferencia

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

ISO 9001:2015 tiene estructura: Cláusula → Requisito → Subrequisito (profundidad variable: 4.1 → 4.1.1 → 4.1.1.1 teóricamente).

### Decisión

Modelar con FK autorreferencial `REQUISITOS_BASE.requisito_padre_id → REQUISITOS_BASE.id`. El árbol se construye en memoria (2 pasadas) en el backend.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Nested Sets** | Consultas de subárboles en O(1) con BETWEEN | Complejidad de mantenimiento (recalcular left/right en cada INSERT). La norma ISO es estática, no cambia después del seed, por lo que la ventaja de lectura rápida no se justifica. |
| **Materialized Path** (ej: "4.1.2") | Consultas con LIKE '4.1%', humano-legible | Ya se usa implícitamente en `descripcion_normativa` ("4.1.2 Texto"). Pero como campo de búsqueda sería frágil ante cambios de numeración. La autorreferencia es más robusta. |
| **Tabla por nivel** (cláusulas, requisitos, subrequisitos separados) | Simplicidad por tabla | Limita la profundidad a un número fijo. ISO 9001 tiene hasta 3 niveles (ej: 7.1.5.1), y futuras normas podrían tener más. La autorreferencia permite profundidad ilimitada. |

### Justificación

- La norma ISO se carga una vez (seed) y nunca se modifica en runtime. La performance de escritura es irrelevante.
- El árbol completo tiene ~80 nodos. Construirlo en memoria con 2 pasadas (indexar + enlazar) es instantáneo.
- La autorreferencia es el patrón más simple y estándar para jerarquías en bases relacionales.

---

## ADR-006: JWT + Refresh Token en DB

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

Se necesita autenticación stateless (para escalar el backend horizontalmente) pero con capacidad de revocar sesiones (para logout, reset de password, etc.).

### Decisión

Esquema dual: Access Token (JWT stateless, 30min) + Refresh Token (UUID en tabla SESSIONS, 24h, cookie HttpOnly).

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Sesiones server-side** (express-session + Redis) | Revocación instantánea, sin JWT en localStorage | Requiere Redis como dependencia adicional. Cada request valida contra Redis (latencia). No es stateless; dificulta escalar horizontalmente sin sticky sessions. |
| **JWT solo (sin refresh)** | Máxima simplicidad | Un JWT de larga duración (24h) no se puede revocar sin blacklist. Un JWT de corta duración (30min) obliga a re-login constante. |
| **OAuth2 con proveedor externo** (Auth0, Firebase Auth) | Zero implementación de auth, MFA gratis | Dependencia de servicio externo para un feature crítico. Costo mensual. El proyecto es on-premise/self-hosted. |

### Justificación

- JWT de 30min para requests rápidos sin hit a DB en cada request.
- Refresh token en DB para poder revocar (logout, cambio de password borra todas las sesiones).
- Cookie HttpOnly protege el refresh contra XSS (JavaScript no puede leerlo).
- SameSite=Strict protege contra CSRF (la cookie no se envía en requests cross-origin).

### Riesgos aceptados

- Access token en localStorage es vulnerable a XSS. Mitigado con: corta duración (30min), Content-Security-Policy en producción, y sanitización de inputs.

---

## ADR-007: RBAC con middleware encadenado

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

El sistema tiene 3 roles con permisos claramente diferenciados. Se necesita un mecanismo de autorización simple y auditable.

### Decisión

RBAC (Role-Based Access Control) implementado como middlewares Express encadenados. Admin bypass implícito.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **ABAC** (Attribute-Based Access Control) | Permisos granulares por atributo (ej: "solo evidencias de su workspace") | Overhead para 3 roles. La granularidad por workspace se resuelve con JOINs en las queries (IDOR protection), no con un motor de políticas. |
| **Librería de permisos** (CASL, Casbin) | Políticas declarativas, fácil de testear | Dependencia adicional para un caso simple. Los 3 roles están hardcoded en la tabla ROLES y no cambian en runtime. |
| **Permisos por endpoint en DB** | Configurable sin re-deploy | Over-engineering para un MVP con 3 roles fijos. Agrega complejidad de UI para gestionar permisos. |

### Justificación

- Con 3 roles fijos, un middleware de 5 líneas (`requireRole`) es suficiente y auditable.
- El bypass de Admin es intencional: el Admin debe poder acceder a todo para resolver incidencias, aunque no puede operar.
- La seguridad a nivel de datos (workspace isolation) se resuelve en las queries con JOINs, no en el middleware de roles.

---

## ADR-008: Docker Compose para despliegue

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

Se necesita un entorno reproducible para desarrollo local y para despliegue en producción.

### Decisión

Docker Compose con 3 servicios: mysql (con healthcheck), backend-js (depende de mysql healthy), frontend (depende de backend).

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Desarrollo sin Docker** (Node + MySQL local) | Menor overhead, startup más rápido | Problemas de "funciona en mi máquina". Cada desarrollador necesita configurar MySQL, variables de entorno, seeds manualmente. |
| **Kubernetes** | Orquestación productiva, auto-scaling, rolling updates | Excesivo para un MVP con un solo servidor de producción. El equipo no tiene experiencia en K8s. Docker Compose es suficiente para el volumen esperado. |
| **PaaS** (Railway, Render, Heroku) | Zero-ops, deploys con git push | Costo mensual para 3 servicios (DB + backend + frontend). Menos control sobre la configuración. Google Drive OAuth requiere URLs fijas que cambian en cada deploy en tier gratuito. |

### Justificación

- Docker Compose garantiza que el entorno de desarrollo es idéntico al de producción.
- Los seeds de DB se ejecutan automáticamente en el primer arranque (montados en `docker-entrypoint-initdb.d/`).
- El healthcheck de MySQL evita que el backend intente conectarse antes de que la DB esté lista.

---

## ADR-009: fetchWithAuth en vez de Axios

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

Cada request del frontend necesita incluir el JWT, manejar la renovación automática en 401, y propagar el workspace activo.

### Decisión

Wrapper custom `fetchWithAuth` (~80 líneas) sobre `fetch` nativo. No se usa Axios ni otra librería HTTP.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Axios + interceptores** | API más ergonómica, interceptores built-in, cancelación | Agrega ~14KB de dependencia para algo que fetch nativo ya hace. Los interceptores de Axios son equivalentes a lo que fetchWithAuth implementa en 80 líneas. |
| **ky** (wrapper moderno de fetch) | Retry built-in, hooks, más conciso | Dependencia adicional poco conocida. Menos documentación y comunidad que fetch nativo. |
| **React Query / SWR** | Cache automático, deduplication, revalidation | Over-engineering para este MVP. Las queries no son frecuentemente re-fetched; se recargan explícitamente tras mutaciones. Agrega complejidad de cache invalidation. |

### Justificación

- 0 dependencias adicionales.
- Control total sobre el flujo de refresh (importante porque el refresh token está en cookie HttpOnly y el retry debe ser transparente).
- El código es auditable y no hay "magia" oculta de una librería.

---

## ADR-010: Seeding estático de la norma ISO

**Estado:** Aceptada  
**Fecha:** 04/05/2026

### Contexto

Originalmente se planteó un módulo para que el Admin suba un CSV con los requisitos de la norma. Esto fue descartado en el ajuste de alcance.

### Decisión

La estructura de ISO 9001:2015 se inserta mediante un script SQL único (`seedISO_utf8.sql`) que se ejecuta una sola vez en el primer despliegue.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Carga dinámica por CSV** (upload + parser) | Flexibilidad para cargar cualquier norma sin re-deploy | Riesgo de datos corruptos por formato incorrecto del CSV. Requiere UI adicional (formulario de upload), validaciones complejas, y manejo de errores parciales. Descartado en documento de ajuste de alcance. |
| **API de creación de requisitos** (CRUD manual) | El Admin construye el árbol desde la interfaz | Extremadamente tedioso para 80+ requisitos. Alto riesgo de error humano. La norma ISO es pública y estable; no tiene sentido digitarla manualmente. |
| **Archivo JSON embebido** en el código | Sin SQL, parseable en cualquier runtime | Menos portable que SQL. No aprovecha las constraints de FK para validar integridad. Más difícil de editar para futuras normas. |

### Justificación

- La norma ISO 9001:2015 no cambia (es un estándar publicado). Un seed estático es la forma más segura de garantizar que los datos son correctos.
- Para agregar una nueva norma en el futuro (ej: ISO 14001), se escribe un nuevo script de seed siguiendo el mismo patrón.
- El seed es idempotente: si ya existe, no se re-ejecuta (controlado por `ensureSeed.js`).

---

## ADR-011: WebSocket para tiempo real

**Estado:** Aceptada  
**Fecha:** 23/04/2026

### Contexto

El sistema requiere notificaciones y chat en tiempo real. Los mensajes de chat deben aparecer instantáneamente para todos los participantes.

### Decisión

WebSocket server (`ws` library) integrado en el mismo proceso HTTP del backend. Se usa `broadcast()` para enviar mensajes a todos los clientes conectados.

### Alternativas consideradas

| Opción | Ventaja | Por qué se descartó |
|--------|---------|---------------------|
| **Server-Sent Events (SSE)** | Más simple (unidireccional), funciona sobre HTTP estándar | SSE es solo server→client. El chat necesita bidireccionalidad (client→server también). Aunque los mensajes se envían por POST, SSE no soporta reconexión con estado tan bien como WebSocket. |
| **Socket.IO** | Fallback automático a polling, rooms, namespaces | Agrega ~50KB de dependencia. Las features de rooms/namespaces no se necesitan (se filtra por nc_id/requisito_id en la query). WebSocket raw es suficiente. |
| **Polling** (fetch cada 5s) | Zero complejidad de infraestructura | Latencia de hasta 5s en mensajes de chat. Overhead de requests innecesarios cuando no hay mensajes nuevos. Mala UX para un chat. |
| **Servicio externo** (Pusher, Ably) | Zero implementación, escalabilidad automática | Costo mensual. Dependencia externa para feature core. El volumen de mensajes es bajo (decenas por día, no miles). |

### Justificación

- La librería `ws` son ~3KB y se integra directamente con el servidor HTTP de Node.js (0 config adicional).
- El volumen esperado es bajo (decenas de usuarios concurrentes máximo). No se necesita clustering ni Redis pub/sub para escalar WebSocket.
- El broadcast es simple: cada nuevo mensaje de chat se envía a todos los clientes conectados. El frontend filtra por nc_id/requisito_id relevante.

---

*Este documento se reserva exclusivamente para decisiones arquitectónicas macro difíciles de revertir. Para la documentación técnica detallada de cada funcionalidad, ver `.kiro/specs/`.*
