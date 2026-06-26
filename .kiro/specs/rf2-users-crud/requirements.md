# Requirements: RF2 - CRUD de Usuarios

## Introduction

Los usuarios representan las personas que acceden a la plataforma de gestión GAP ISO 9001:2015. Solo el rol Admin puede gestionar usuarios (crear, editar, eliminar, asignar workspace/rol). Los usuarios pueden cambiar su propia contraseña.

## Requirements

### Requirement 1: Crear Usuario

**User Story:** Como Administrador, quiero crear un nuevo usuario asignándole nombre, email, rol y workspace, para que pueda acceder a la plataforma.

#### Acceptance Criteria

1. Campos obligatorios: nombre, email, workspace_id, role_id.
2. Password es opcional al crear; si no se provee, el usuario no podrá hacer login hasta que el Admin le asigne una.
3. El email se normaliza a minúsculas y debe ser único (HTTP 409 si ya existe).
4. Se valida que el workspace y el rol referenciados existan (HTTP 404 si no).
5. El password se hashea con bcrypt (10 rounds) antes de almacenarse.
6. El estado inicial del usuario es siempre "Pendiente" (debe cambiar su contraseña para activarse).
7. Retorna HTTP 201 { id }.
8. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 2: Leer Usuarios

**User Story:** Como Administrador, quiero ver la lista de todos los usuarios y acceder a uno por ID, para gestionar los accesos de la plataforma.

#### Acceptance Criteria

1. `GET /api/users` retorna array con todos los usuarios (id, nombre, email, role_id, workspace_id, estado_invitacion).
2. `GET /api/users/:id` retorna un usuario o HTTP 404.
3. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 3: Actualizar Usuario

**User Story:** Como Administrador, quiero editar los datos de un usuario (nombre, email, rol, workspace, password), para mantener los accesos actualizados.

#### Acceptance Criteria

1. `PUT /api/users/:id` actualiza nombre, email, workspace_id, role_id.
2. Si se incluye password, se hashea y el estado pasa a "Pendiente" (el usuario deberá cambiarla).
3. Si el email nuevo ya existe en otro usuario, retorna HTTP 409.
4. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 4: Eliminar Usuario

**User Story:** Como Administrador, quiero eliminar un usuario de la plataforma, con confirmación de seguridad.

#### Acceptance Criteria

1. `DELETE /api/users/:id` elimina el registro del usuario.
2. Al eliminar un usuario, sus sesiones y tokens se eliminan en cascada.
3. Sus referencias en auditorías, evidencias y actividades quedan como NULL (preservando el historial).
4. La interfaz requiere escribir "eliminar" antes de confirmar.
5. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 5: Asignar Rol

**User Story:** Como Administrador, quiero asignar un rol a un usuario al crearlo o editarlo, para definir sus permisos en la plataforma.

#### Acceptance Criteria

1. Los roles disponibles son: Administrador (1), Evaluador (2), Responsable SGC (3).
2. El rol se selecciona desde un dropdown en la interfaz.
3. El rol determina los permisos de acceso a endpoints y vistas.

### Requirement 6: Registrar Correo Electrónico

**User Story:** Como Administrador, quiero registrar el email del usuario, que sirve como identificador único de acceso.

#### Acceptance Criteria

1. El email es obligatorio y se almacena normalizado (lowercase, trimmed).
2. El campo tiene restricción UNIQUE en base de datos.
3. Se muestra error 409 si el email ya está registrado.

### Requirement 7: Búsqueda de Espacios

**User Story:** Como Administrador, quiero buscar usuarios por nombre, email, rol o workspace, para encontrar rápidamente al usuario que necesito gestionar.

#### Acceptance Criteria

1. El filtrado es client-side y busca en: nombre, email, nombre del workspace, nombre del rol.
2. La búsqueda es parcial y case-insensitive.

### Requirement 8: Advertencia y Cancelación de Eliminación

**User Story:** Como Administrador, quiero recibir una advertencia antes de eliminar un usuario, con opción de cancelar.

#### Acceptance Criteria

1. Al hacer click en "Eliminar", aparece un ConfirmDialog modal.
2. El diálogo indica que la acción no se puede deshacer.
3. Se debe escribir "eliminar" para habilitar el botón de confirmación.
4. Existe botón "Cancelar" visible.

### Requirement 9: Cambio de Contraseña por el Propio Usuario

**User Story:** Como Usuario, quiero cambiar mi propia contraseña para mantener segura mi cuenta.

#### Acceptance Criteria

1. `PUT /api/users/:id/password` solo puede ser ejecutado por el propio usuario (req.user.id === id).
2. Requiere enviar `currentPassword` y `password` (nueva).
3. Se valida que `currentPassword` coincida con el hash actual (HTTP 401 si no).
4. Al cambiar exitosamente, el estado pasa de "Pendiente" a "Aceptada".
5. La nueva contraseña se hashea con bcrypt (10 rounds).
