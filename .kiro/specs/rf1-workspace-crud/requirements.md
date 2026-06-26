# Requirements: RF1 - CRUD de Espacios de Trabajo

## Introduction

Los "Espacios de Trabajo" representan clientes dentro de la plataforma de gestión GAP ISO 9001:2015. Solo el rol Admin puede gestionar espacios. Al crear uno, se generan automáticamente filas de evaluación para todos los requisitos ISO existentes.

## Requirements

### Requirement 1: Crear Espacio de Trabajo

**User Story:** Como Administrador, quiero crear un nuevo espacio de trabajo con el nombre del cliente, para que ese cliente tenga un entorno de evaluación propio.

#### Acceptance Criteria

1. El sistema debe aceptar un campo `nombre_cliente` obligatorio para crear el espacio.
2. Al crear el espacio, se deben generar automáticamente registros de evaluación (`EVALUACION_REQUISITO`) para todos los requisitos ISO existentes con estado inicial "NA".
3. El sistema debe retornar HTTP 201 con el ID del espacio creado.
4. Si el seed de evaluaciones falla, el espacio se crea igualmente (error no bloqueante).
5. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 2: Leer Espacios de Trabajo

**User Story:** Como Administrador, quiero ver la lista de todos los espacios de trabajo y acceder a uno específico por ID, para gestionar los clientes de la plataforma.

#### Acceptance Criteria

1. `GET /api/workspaces` debe retornar un array con todos los espacios (id, nombre_cliente, fecha_creacion).
2. `GET /api/workspaces/:id` debe retornar los datos del espacio o HTTP 404 si no existe.
3. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 3: Actualizar Espacio de Trabajo

**User Story:** Como Administrador, quiero editar el nombre del cliente de un espacio de trabajo existente, para mantener la información actualizada.

#### Acceptance Criteria

1. `PUT /api/workspaces/:id` debe actualizar el campo `nombre_cliente`.
2. Solo usuarios con rol Admin pueden ejecutar esta operación.
3. La edición se realiza inline en la tabla de la interfaz.

### Requirement 4: Eliminar Espacio de Trabajo

**User Story:** Como Administrador, quiero eliminar un espacio de trabajo, entendiendo que esta acción elimina en cascada todos los datos asociados al cliente.

#### Acceptance Criteria

1. `DELETE /api/workspaces/:id` debe eliminar el espacio y en cascada: evaluaciones, evidencias, brechas, acciones correctivas, historial y chat asociados.
2. Los archivos de evidencia en Google Drive NO se eliminan (se conservan como respaldo histórico).
3. Los usuarios asignados al workspace NO se eliminan (quedan con workspace_id = NULL).
4. La interfaz debe mostrar un diálogo de confirmación que requiere escribir "eliminar" antes de proceder.
5. Solo usuarios con rol Admin pueden ejecutar esta operación.

### Requirement 5: Motor de Búsqueda

**User Story:** Como Administrador, quiero buscar espacios por nombre o ID, para localizar rápidamente un cliente.

#### Acceptance Criteria

1. El filtrado se realiza client-side (volumen bajo esperado: decenas de workspaces).
2. Se filtra por nombre_cliente (parcial, case-insensitive) o por ID (exacto).

### Requirement 6: Advertencia y Cancelación de Eliminación

**User Story:** Como Administrador, quiero recibir una advertencia antes de eliminar un espacio, con opción de cancelar, para evitar eliminaciones accidentales.

#### Acceptance Criteria

1. Al hacer click en "Eliminar", debe aparecer un diálogo modal de confirmación.
2. El diálogo debe indicar que la acción es irreversible y eliminará datos asociados.
3. El usuario debe escribir "eliminar" para habilitar el botón de confirmación.
4. Debe existir un botón "Cancelar" claramente visible.
5. El overlay del diálogo debe cubrir toda la pantalla incluyendo sidebar y header.
