# RF1: CRUD de Espacios de Trabajo

## Qué resuelve

Un "Espacio de Trabajo" = un cliente. Solo Admin los gestiona. Al crear uno, se inicializan evaluaciones para todos los requisitos ISO.

## Operaciones

| Operación | Endpoint | Qué hace |
|-----------|----------|----------|
| Crear | POST `/api/workspaces` | Inserta workspace + siembra evaluaciones para todos los requisitos |
| Listar | GET `/api/workspaces` | Retorna array con todos los espacios (id, nombre, fecha) |
| Obtener uno | GET `/api/workspaces/:id` | Retorna un espacio o 404 |
| Actualizar | PUT `/api/workspaces/:id` | Actualiza nombre_cliente |
| Eliminar | DELETE `/api/workspaces/:id` | Elimina workspace + cascade en evaluaciones/evidencias |

Todas protegidas con `requireAuth + requireRole('Admin')`.

## Flujo paso a paso

### Crear espacio

```
[Admin en WorkspacesManager]
    → Click "Agregar Espacio" (barra de título de la tabla)
    → Fila inline con input de nombre
    → Click "Enviar"
    → POST /api/workspaces { nombre_cliente }
        → INSERT INTO ESPACIO_TRABAJO
        → INSERT INTO EVALUACION_REQUISITO (seed de todos los requisitos con estado "NA")
        → 201 { id }
    → Lista se recarga, toast "Espacio creado"
```

### Editar espacio

```
[Admin en WorkspacesManager]
    → Click "Editar" en una fila
    → El nombre se convierte en input editable
    → Cambia el nombre, click "Guardar"
    → PUT /api/workspaces/:id { nombre_cliente }
    → Lista se recarga, toast "Espacio actualizado"
```

### Eliminar espacio

```
[Admin en WorkspacesManager]
    → Click "Eliminar"
    → ConfirmDialog: debe escribir "eliminar"
    → DELETE /api/workspaces/:id
        → MySQL cascade: evaluaciones, evidencias, brechas, historial, chat
        → Usuarios quedan con workspace_id = NULL (NO se eliminan)
        → Archivos en Google Drive NO se eliminan (respaldo histórico)
    → Lista se recarga, toast "Espacio eliminado"
```

### Buscar

```
[Admin en WorkspacesManager]
    → Escribe en SearchInput
    → Filtrado client-side por nombre_cliente o ID (instantáneo)
```

### Acceder a un espacio

```
[Admin en WorkspacesManager]
    → Click "Acceder" en un workspace
    → Se setea actingWorkspace en sessionStorage
    → Navega a /lobby (ahora ve el workspace como si fuera Evaluador/Responsable)
```

## Dónde vive cada pieza

| Concepto | Archivo |
|----------|---------|
| Tabla DB | `seeds/init.sql` → ESPACIO_TRABAJO |
| Rutas | `src/routes/workspaces.js` |
| Controller | `src/controllers/useWorkspaces.js` |
| Hook frontend | `frontend/src/hooks/useWorkspaces.js` |
| Página | `frontend/src/pages/WorkspacesManager.jsx` |

## Protecciones

- Solo Admin (requireAuth + requireRole('Admin'))
- Confirmación de eliminación escribiendo "eliminar"
- Usuarios no se eliminan en cascada (ON DELETE SET NULL)
- Archivos en Drive se conservan como respaldo post-eliminación
