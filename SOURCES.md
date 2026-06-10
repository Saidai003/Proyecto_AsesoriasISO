# Fuentes y justificación de fragmentos SQL y código

Este documento recoge las URLs de la documentación oficial y otras fuentes que sustentan fragmentos de código en el repositorio, indicando el archivo y el rango de líneas correspondiente.

## Mapeo: [db/init.sql](db/init.sql#L1-L8)

- Rango de líneas: [db/init.sql](db/init.sql#L1-L8)
  - Fragmento (línea 1): Comentario inicial — "Inicializa la base de datos MySQL para el proyecto".
    - Fuente: Documentación sobre comentarios en SQL (MySQL): https://dev.mysql.com/doc/refman/8.0/en/comments.html

  - Fragmento (línea 2): `CREATE DATABASE IF NOT EXISTS proyecto_iso CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    - Fuentes:
      - CREATE DATABASE: https://dev.mysql.com/doc/refman/8.0/en/create-database.html
      - Charset y collations (utf8mb4): https://dev.mysql.com/doc/refman/8.0/en/charset.html

  - Fragmento (línea 3): Comentario de seguridad — "Cambia estos valores en producción".
    - Fuente (prácticas y consideraciones de seguridad en MySQL): https://dev.mysql.com/doc/refman/8.0/en/security.html

  - Fragmento (línea 4): `CREATE USER IF NOT EXISTS 'proyecto_user'@'%' IDENTIFIED BY 'change_me';`
    - Fuentes:
      - CREATE USER: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
      - Sintaxis de nombres de cuentas y host: https://dev.mysql.com/doc/refman/8.0/en/account-names.html

  - Fragmento (línea 5): `GRANT ALL PRIVILEGES ON proyecto_iso.* TO 'proyecto_user'@'%';`
    - Fuente: GRANT (gestión de privilegios): https://dev.mysql.com/doc/refman/8.0/en/grant.html

  - Fragmento (línea 6): `FLUSH PRIVILEGES;`
    - Fuente: FLUSH (recarga de privilegios y otras operaciones FLUSH): https://dev.mysql.com/doc/refman/8.0/en/flush.html
    - Nota: `FLUSH PRIVILEGES` es necesario solo cuando se editan manualmente las tablas de privilegios; la sentencia `GRANT` ya actualiza privilegios.

  - Fragmento (línea 8): `USE proyecto_iso;`
    - Fuente: Uso de bases de datos: https://dev.mysql.com/doc/refman/8.0/en/using-databases.html

---

Siguientes pasos opcionales:
- Insertar estos enlaces como comentarios directamente en [db/init.sql](db/init.sql#L1-L8).
- Extender el mapeo para el resto del archivo `db/init.sql` y otros archivos del proyecto.

## Nuevos fragmentos: Backend (API) y Frontend (integración)

### Base de datos: tabla `USUARIOS` en [db/init.sql](db/init.sql#L47-L58)
- Rango de líneas: [db/init.sql](db/init.sql#L47-L58)
  - Fragmento: definición de la tabla `USUARIOS` (campos `nombre`, `email`, `password_hash`, `estado_invitacion`, `fecha_registro`).
  - Fuente(s): estructura de tablas en MySQL: https://dev.mysql.com/doc/refman/8.0/en/creating-tables.html

### Backend: `backend-js/src/db.js`
- Archivo: [backend-js/src/db.js](backend-js/src/db.js)
  - Fragmento: creación de `mysql2` pool con `createPool` y `testConnection()` que usa `pool.getConnection()` y `conn.ping()`.
  - Fuentes:
    - `mysql2` (promise wrapper, pools, prepared statements): https://github.com/sidorares/node-mysql2#using-promise-wrapper
    - Pooling concepts: https://github.com/sidorares/node-mysql2#using-connection-pools

### Backend: `backend-js/src/index.js`
- Archivo: [backend-js/src/index.js](backend-js/src/index.js)
  - Fragmentos añadidos:
    - `app.use(express.json())` — parsing JSON bodies for API requests.
      - Fuente: `express.json()` body parser: https://expressjs.com/en/4x/api.html#express.json
    - CORS headers middleware (desarrollo): `Access-Control-Allow-Origin`, etc.
      - Fuente: CORS overview and headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    - POST `/api/users` endpoint: recibe `nombre`, `email`, `password`, hashea la contraseña con `bcryptjs` y usa `pool.execute` para un INSERT preparado.
      - Fuente: Express routing and handlers: https://expressjs.com/en/4x/api.html#app.METHOD
      - Fuente: `bcryptjs` hashing usage: https://github.com/dcodeIO/bcrypt.js
      - Fuente: `mysql2` prepared statements / execute: https://github.com/sidorares/node-mysql2#using-prepared-statements

### Frontend: `frontend/src/pages/UsersManager.jsx`
- Archivo: [frontend/src/pages/UsersManager.jsx](frontend/src/pages/UsersManager.jsx)
  - Fragmento: formulario de creación de usuario y llamada `fetch('http://localhost:3000/api/users', { method: 'POST', body: JSON.stringify(...) })`.
  - Fuentes:
    - Fetch API usage: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    - JSON request/response handling (browser): https://developer.mozilla.org/en-US/docs/Web/API/Request/Request

### Paquetes y dependencias
- `bcryptjs` (backend) — para hashear contraseñas: https://www.npmjs.com/package/bcryptjs

---

Notas de coherencia y acciones realizadas:
- Implementé el endpoint POST `/api/users` en `backend-js/src/index.js` para insertar en la tabla `USUARIOS` (ver `[db/init.sql](db/init.sql#L47-L58)`). La implementación usa `bcryptjs` para hashing y `mysql2` `pool.execute` con parámetros preparados, conforme a las guías de `mysql2` y `bcryptjs`.
- Añadí middleware CORS simple para desarrollo — la documentación MDN aclara por qué se necesita; en producción debería usarse el paquete `cors` o restricciones de orígenes específicas.
- En el frontend actualicé `frontend/src/pages/UsersManager.jsx` para enviar POST `fetch` al endpoint. Esto sigue el patrón documentado por MDN para `fetch`.

Si deseas, puedo:
- Insertar referencias concretas (comentarios con URLs) directamente dentro de los archivos `backend-js/src/index.js` y `frontend/src/pages/UsersManager.jsx` junto a los fragmentos relevantes.
- Añadir validaciones adicionales (email único, control de longitudes) y actualizar la documentación con las referencias correspondientes.

