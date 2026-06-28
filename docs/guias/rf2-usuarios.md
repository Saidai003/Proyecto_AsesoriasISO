# RF2: CRUD de Usuarios

## Qué resuelve

Gestión de accesos. Solo Admin crea/edita/elimina usuarios. Los usuarios pueden cambiar su propia contraseña.

## Operaciones

| Operación | Endpoint | Qué hace |
|-----------|----------|----------|
| Crear | POST `/api/users` | Crea usuario con nombre, email, rol, workspace, password opcional |
| Listar | GET `/api/users` | Retorna array con todos los usuarios |
| Obtener uno | GET `/api/users/:id` | Retorna un usuario o 404 |
| Actualizar | PUT `/api/users/:id` | Actualiza nombre, email, rol, workspace (y opcionalmente password) |
| Eliminar | DELETE `/api/users/:id` | Elimina usuario (sesiones cascade, historial SET NULL) |
| Asignar workspace | PUT `/api/users/:id/workspace` | Cambia solo el workspace_id |
| Cambiar password | PUT `/api/users/:id/password` | Solo el propio usuario, requiere contraseña actual |
| Listar responsables | GET `/api/users/responsables` | Lista usuarios con rol "Responsable SGC" |

Todas Admin-only excepto `/password` (propio) y `/responsables` (cualquier autenticado).

## Flujo paso a paso

### Crear usuario

```
[Admin en UsersManager]
    → Click "Agregar Usuario"
    → Fila inline: nombre, email, rol (dropdown), workspace (dropdown)
    → Fila expandida: password opcional
    → Click "Guardar"
    → POST /api/users { nombre, email, role_id, workspace_id, password? }
        → Valida email único (409 si existe)
        → Valida workspace y rol existen (404 si no)
        → bcrypt.hash(password, 10) si se dio
        → INSERT con estado = 'Pendiente'
        → 201 { id }
    → Toast "Usuario creado"
```

### Editar usuario

```
[Admin en UsersManager]
    → Click "Editar" en una fila
    → Campos se convierten en inputs (nombre, email, rol, workspace)
    → Fila expandida muestra campo "Nueva contraseña" opcional
    → Click "Guardar"
    → PUT /api/users/:id { nombre, email, role_id, workspace_id, password? }
        → Si incluye password → hash + estado vuelve a "Pendiente"
        → Si email cambió y ya existe → 409
    → Toast "Usuario actualizado"
```

### Eliminar usuario

```
[Admin en UsersManager]
    → Click "Eliminar"
    → ConfirmDialog: debe escribir "eliminar"
    → DELETE /api/users/:id
        → Sesiones y tokens se eliminan (CASCADE)
        → Auditorías, evidencias, actividad quedan con referencia NULL
    → Toast "Usuario eliminado"
```

### Cambiar contraseña (propio usuario)

```
[Usuario en /settings]
    → Escribe: contraseña actual + nueva + confirmar
    → Click "Guardar contraseña"
    → PUT /api/users/:id/password { currentPassword, password }
        → Verifica que req.user.id === :id (403 si no)
        → bcrypt.compare(currentPassword, hash) → 401 si falla
        → bcrypt.hash(newPassword, 10)
        → Si estado era "Pendiente" → pasa a "Aceptada"
        → Si ya era "Aceptada" → solo actualiza hash
    → Toast "Contraseña actualizada"
```

### Reset de password por Admin

```
[Admin en UsersManager]
    → Click "Editar" en un usuario
    → Escribe nueva contraseña en campo expandido
    → Click "Guardar"
    → PUT /api/users/:id { ..., password }
        → bcrypt.hash + estado vuelve a "Pendiente"
    → El usuario deberá cambiar su contraseña al próximo login
```

### Buscar

```
[Admin en UsersManager]
    → Escribe en SearchInput
    → Filtrado client-side por: nombre, email, nombre del rol, nombre del workspace
```

## Dónde vive cada pieza

| Concepto | Archivo |
|----------|---------|
| Tabla DB | `seeds/init.sql` → USUARIOS |
| Rutas | `src/routes/users.js` |
| Controller | `src/controllers/userController.js` |
| Hook frontend | `frontend/src/hooks/useUsers.js` |
| Página Admin | `frontend/src/pages/UsersManager.jsx` |
| Página usuario | `frontend/src/pages/Settings.jsx` |

## Estados del usuario

| Estado | Significado | Transición |
|--------|-------------|------------|
| Pendiente | Creado por Admin o password reseteado, debe cambiar contraseña | Creación / Admin reset |
| Aceptada | Cambió su contraseña, opera normalmente | PUT /:id/password exitoso |

## Protecciones

- Solo Admin para CRUD (requireAuth + requireRole('Admin'))
- Cambio de password: solo el propio usuario (req.user.id === :id)
- Confirmación de eliminación escribiendo "eliminar"
- Email único enforced a nivel DB + pre-check en controller
