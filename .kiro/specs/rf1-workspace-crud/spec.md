# RF1: CRUD de Espacios de Trabajo

## Visión general

Un "Espacio de Trabajo" representa a un **cliente** dentro de la plataforma. Solo el rol **Admin** puede gestionar espacios. Cuando se crea uno, automáticamente se generan filas de evaluación para todos los requisitos ISO existentes.

**Criterios completados:** RF1-CA-001, CA-002, CA-003, CA-004, CA-007, CA-008, CA-009

---

## 1. Base de datos

**Tabla:** `ESPACIO_TRABAJO` (en `backend-js/seeds/init.sql`)

```sql
CREATE TABLE ESPACIO_TRABAJO (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Tres columnas simples: un ID autoincremental, el nombre del cliente, y la fecha de creación automática.

**Relación clave:** Cuando se crea un workspace, también se insertan registros en `EVALUACION_REQUISITO` (una fila por cada requisito ISO existente, con estado inicial `"NA"`).

---

## 2. Backend — Rutas

**Archivo:** `backend-js/src/routes/workspaces.js`

```javascript
router.get('/',    requireAuth, requireRole('Admin'), listWorkspaces);
router.post('/',   requireAuth, requireRole('Admin'), createWorkspace);
router.get('/:id', requireAuth, requireRole('Admin'), getWorkspace);
router.put('/:id', requireAuth, requireRole('Admin'), updateWorkspace);
router.delete('/:id', requireAuth, requireRole('Admin'), deleteWorkspace);
```

Todos los endpoints están protegidos con dos middlewares en cadena:

1. `requireAuth` — verifica el JWT Bearer token del header Authorization
2. `requireRole('Admin')` — solo permite acceso al rol Admin

Se montan en `index.js` como `app.use('/api/workspaces', workspacesRouter)`.

> **Referencia de middleware:** Ver [Autenticación y Autorización](../shared/auth-middleware.md)

---

## 3. Backend — Controller

**Archivo:** `backend-js/src/controllers/useWorkspaces.js`

+-------------------+--------------------------------------+------------+
| Función           | Qué hace                             | CA         |
+-------------------+--------------------------------------+------------+
| createWorkspace   | Inserta registro (nombre_cliente).   | RF1-CA-001 |
|                   | Siembra eval. por cada requisito.    |            |
|                   | Retorna 201 + id.                    |            |
+-------------------+--------------------------------------+------------+
| listWorkspaces    | SELECT id, nombre_cliente y          | RF1-CA-002 |
|                   | fecha_creacion de todos los espacios.|            |
+-------------------+--------------------------------------+------------+
| getWorkspace      | Busca por id.                        | RF1-CA-002 |
|                   | Si no existe, retorna 404.           |            |
+-------------------+--------------------------------------+------------+
| updateWorkspace   | UPDATE de nombre_cliente por id.     | RF1-CA-003 |
+-------------------+--------------------------------------+------------+
| deleteWorkspace   | DELETE por id.                       | RF1-CA-004 |
|                   | Elimina en cascada todo (eval.,      |            |
|                   | evidencias, etc.).                   |            |
+-------------------+--------------------------------------+------------+


**Detalle de `createWorkspace`:**

```javascript
// 1. Insertar el workspace
const [result] = await pool.execute(
    'INSERT INTO ESPACIO_TRABAJO (nombre_cliente, fecha_creacion) VALUES (?, NOW())',
    [nombre_cliente]
);
const workspaceId = result.insertId;

// 2. Sembrar evaluaciones para todos los requisitos existentes
await pool.query(
    'INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, ultima_edicion_por, fecha_ultima_edicion) SELECT id, ?, "NA", NULL, NOW() FROM REQUISITOS_BASE',
    [workspaceId]
);
```

Si el seed de evaluaciones falla, el workspace se crea de todos modos (error no bloqueante, solo se loguea).

---

## 4. Frontend — Hook personalizado

**Archivo:** `frontend/src/hooks/useWorkspaces.js`

Custom hook que encapsula todo el acceso a la API:

```javascript
export default function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(false)

  const loadWorkspaces = ...    // GET /api/workspaces
  const createWorkspace = ...   // POST /api/workspaces
  const updateWorkspace = ...   // PUT /api/workspaces/:id
  const deleteWorkspace = ...   // DELETE /api/workspaces/:id

  return { workspaces, loading, loadWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace }
}
```

Usa `fetchWithAuth` (utilidad que adjunta automáticamente el JWT al header y maneja refresh).

> **Referencia:** Ver [Capa API fetchWithAuth](../shared/fetch-with-auth.md)

---

## 5. Frontend — Página WorkspacesManager.jsx

**Archivo:** `frontend/src/pages/WorkspacesManager.jsx`

Vista principal que cubre los criterios visuales:

| Criterio | Implementación |
|----------|----------------|
| RF1-CA-001 (Crear) | Botón "Agregar Espacio" → fila inline con input + botón "Enviar" |
| RF1-CA-002 (Leer) | Tabla con todas las filas, columnas: Cliente, Fecha Creación, Acciones |
| RF1-CA-003 (Actualizar) | Botón "Editar" → input inline, botones "Guardar"/"Cancelar" |
| RF1-CA-004 (Eliminar) | Botón "Eliminar" (rojo) |
| RF1-CA-007 (Búsqueda) | Componente `SearchInput` que filtra por nombre o ID en tiempo real |
| RF1-CA-008 (Advertencia) | Componente `ConfirmDialog` que pregunta "¿Confirmar eliminación?" |
| RF1-CA-009 (Cancelar) | Botón "Cancelar" en el `ConfirmDialog` |

La página está envuelta en `<Protected role="Admin">`, que redirige si el usuario no tiene ese rol.

**Búsqueda client-side:**

```javascript
const filteredWorkspaces = useMemo(() => {
  if (!q) return workspaces || []
  const s = q.toLowerCase()
  return (workspaces || []).filter(w =>
    (w.nombre_cliente || '').toLowerCase().includes(s) || String(w.id).includes(s)
  )
}, [workspaces, q])
```

El filtrado es local porque el volumen esperado de workspaces es bajo (decenas, no miles).

---

## 6. Flujo completo de ejemplo (Crear Espacio)

```
[Admin en WorkspacesManager]
    → Click "Agregar Espacio"
    → Aparece fila inline con input
    → Escribe nombre del cliente
    → Click "Enviar"
    → useWorkspaces.createWorkspace({ nombre_cliente })
        → fetchWithAuth POST /api/workspaces (con JWT)
            → requireAuth → requireRole('Admin') → createWorkspace controller
                → INSERT INTO ESPACIO_TRABAJO
                → INSERT INTO EVALUACION_REQUISITO (seed de todos los requisitos)
                → Respuesta 201 { id }
    → Se recarga la lista automáticamente
    → Toast "Espacio creado"
```

---

## 7. Endpoints REST (resumen)

| Método | Ruta | Función | CA |
|--------|------|---------|-----|
| POST | `/api/workspaces` | Crear espacio + seed evaluaciones | RF1-CA-001 |
| GET | `/api/workspaces` | Listar todos los espacios | RF1-CA-002 |
| GET | `/api/workspaces/:id` | Obtener un espacio por ID | RF1-CA-002 |
| PUT | `/api/workspaces/:id` | Actualizar nombre del cliente | RF1-CA-003 |
| DELETE | `/api/workspaces/:id` | Eliminar espacio (cascada) | RF1-CA-004 |

---

## 8. Comportamiento de eliminación en cascada

Al eliminar un workspace (`DELETE FROM ESPACIO_TRABAJO WHERE id = ?`), MySQL ejecuta el cascade por foreign keys:

```
ESPACIO_TRABAJO (eliminado)
  → EVALUACION_REQUISITO (cascade)
      → EVIDENCIAS (cascade)
          → EVIDENCIAS_LOG (cascade)
      → AUDITORIA_NC (cascade)
          → ACCIONES_CORRECTIVAS (set null en auditoria_nc_id)
          → AUDITORIA_NC_HIST (cascade)
          → CHAT_MESSAGES (cascade)
  → USUARIOS (cascade)
      → SESIONES_USUARIO, SESSIONS, NOTIFICACIONES (cascade)
```

**Decisión deliberada sobre Google Drive:** Los archivos de evidencia almacenados en Google Drive **no se eliminan** al borrar un workspace. Los `drive_file_id` desaparecen de la base de datos, pero los archivos físicos permanecen en Drive como respaldo. Esto es intencional: se conservan como registro histórico por si se requiere auditoría posterior a la baja de un cliente.
