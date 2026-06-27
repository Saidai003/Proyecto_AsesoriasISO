# Requirements Document

## Introduction

Esta funcionalidad implementa el flujo de cambio obligatorio de contraseña en el primer inicio de sesión. Cuando un administrador crea un usuario con una contraseña temporal, dicho usuario debe cambiarla obligatoriamente antes de acceder al sistema. Adicionalmente, se refuerza la validación para que no se permita crear usuarios sin contraseña.

## Glossary

- **Sistema_Backend**: El servidor Node.js/Express que expone la API REST del proyecto ISO.
- **Sistema_Frontend**: La aplicación React (SPA) que consume la API del Sistema_Backend.
- **Modal_Cambio_Contraseña**: Componente JSX tipo popup/modal que se muestra al usuario cuando debe cambiar su contraseña en el primer inicio de sesión.
- **Estado_Pendiente**: Valor `'Pendiente'` en la columna `estado_invitacion` de la tabla USUARIOS, indica que el usuario aún no ha cambiado su contraseña temporal.
- **Estado_Activo**: Valor `'Aceptada'` en la columna `estado_invitacion` de la tabla USUARIOS, indica que el usuario ya activó su cuenta con su propia contraseña.
- **Contraseña_Temporal**: Contraseña asignada por el administrador al momento de crear el usuario (ej: `'Admin123'`).
- **Token_Definitivo**: JWT de acceso que permite al usuario operar normalmente en el sistema.

## Requirements

### Requisito 1: Validación obligatoria de contraseña en creación de usuario

**User Story:** Como administrador, quiero que el sistema exija una contraseña válida al crear un usuario, para que ningún usuario quede sin credenciales de acceso.

#### Criterios de Aceptación

1. IF el administrador envía una solicitud de creación de usuario sin campo `password`, THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y un mensaje de error indicando que la contraseña es obligatoria.
2. IF el administrador envía una solicitud de creación de usuario con `password` vacío, nulo, o compuesto solo de espacios, THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y un mensaje de error indicando que la contraseña es obligatoria.
3. IF el administrador envía una solicitud de creación de usuario con un `password` que tiene menos de 8 caracteres (excluyendo espacios al inicio y al final), THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y un mensaje de error indicando que la contraseña debe tener al menos 8 caracteres.
4. WHEN el administrador envía una solicitud de creación de usuario con un `password` válido (cadena con al menos 8 caracteres no-espacio y máximo 72 caracteres en total), THE Sistema_Backend SHALL almacenar el hash de dicha contraseña, crear el usuario con estado `'Pendiente'`, y responder con un código HTTP 201 y un cuerpo JSON que contenga el `id` del usuario creado.
5. IF el administrador envía una solicitud de creación de usuario con un `password` que excede 72 caracteres de longitud, THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y un mensaje de error indicando que la contraseña excede la longitud máxima permitida.

### Requisito 2: Login con detección de estado Pendiente

**User Story:** Como usuario recién creado, quiero que al iniciar sesión con mi contraseña temporal el sistema detecte que debo cambiarla, para que me indique el paso necesario antes de acceder.

#### Criterios de Aceptación

1. WHEN un usuario con `estado_invitacion = 'Pendiente'` ingresa credenciales válidas (email y contraseña temporal correctos), THE Sistema_Backend SHALL responder con un código HTTP 200 y un cuerpo JSON que contenga `{ status: 'requires_password_change', userId: <id_del_usuario> }` sin incluir token de acceso, roles ni datos personales adicionales.
2. WHEN un usuario con `estado_invitacion = 'Aceptada'` ingresa credenciales válidas, THE Sistema_Backend SHALL responder con un código HTTP 200, un token de acceso y un objeto usuario que contenga id, nombre, email, rol y workspace_id.
3. WHEN un usuario con `estado_invitacion = 'Pendiente'` ingresa credenciales incorrectas (email inexistente, contraseña errónea o campos vacíos), THE Sistema_Backend SHALL responder con un código HTTP 401 y el error `'invalid_credentials'` sin revelar el estado de invitación del usuario.
4. IF un usuario con `estado_invitacion = 'Expirada'` ingresa credenciales válidas, THEN THE Sistema_Backend SHALL responder con un código HTTP 401 y el error `'invalid_credentials'` sin revelar que la invitación ha expirado.
5. IF el usuario envía una solicitud de login sin los campos `email` o `password`, THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y el error `'email_and_password_required'` sin realizar consulta a la base de datos.

### Requisito 3: Endpoint de cambio de contraseña en primer login

**User Story:** Como usuario en estado Pendiente, quiero poder enviar mi nueva contraseña definitiva al sistema, para que se active mi cuenta y obtenga acceso completo.

#### Criterios de Aceptación

1. WHEN un usuario en estado `'Pendiente'` envía una solicitud al endpoint de cambio de contraseña con su `userId`, `currentPassword` (contraseña temporal) y `newPassword` que tiene entre 8 y 72 caracteres, THE Sistema_Backend SHALL actualizar el hash de la contraseña, cambiar el `estado_invitacion` a `'Aceptada'`, y responder con un token de acceso definitivo y la información del usuario (id, nombre, email, role, workspace_id).
2. WHEN un usuario envía una solicitud al endpoint de cambio de contraseña con `currentPassword` incorrecta, THE Sistema_Backend SHALL responder con un código HTTP 401 y el error `'invalid_current_password'`.
3. WHEN un usuario envía una solicitud al endpoint de cambio de contraseña con `newPassword` vacío, nulo, o compuesto solo de espacios, THE Sistema_Backend SHALL responder con un código HTTP 400 y el error `'new_password_required'`.
4. WHEN un usuario con `estado_invitacion = 'Aceptada'` intenta usar el endpoint de cambio de contraseña de primer login, THE Sistema_Backend SHALL responder con un código HTTP 403 y el error `'already_activated'`.
5. IF el `newPassword` proporcionado tiene menos de 8 caracteres o más de 72 caracteres, THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y el error `'invalid_password_length'`.
6. IF el `userId` proporcionado no corresponde a un usuario existente, THEN THE Sistema_Backend SHALL responder con un código HTTP 404 y el error `'not_found'`.
7. IF el usuario en estado `'Pendiente'` no tiene `password_hash` almacenado (contraseña temporal no fue asignada), THEN THE Sistema_Backend SHALL responder con un código HTTP 401 y el error `'invalid_current_password'`.

### Requisito 4: Modal de cambio de contraseña en el frontend

**User Story:** Como usuario en estado Pendiente, quiero ver un formulario modal tras iniciar sesión con mi contraseña temporal, para poder ingresar y confirmar mi nueva contraseña sin salir del flujo de login.

#### Criterios de Aceptación

1. WHEN el Sistema_Frontend recibe la respuesta `{ status: 'requires_password_change' }` del endpoint de login, THE Sistema_Frontend SHALL mostrar el Modal_Cambio_Contraseña sobre la página de login.
2. THE Modal_Cambio_Contraseña SHALL contener un campo de entrada para "Nueva contraseña", un campo de entrada para "Confirmar contraseña", y un botón de envío.
3. WHILE el Modal_Cambio_Contraseña está visible, THE Sistema_Frontend SHALL deshabilitar el botón de envío si los campos "Nueva contraseña" y "Confirmar contraseña" no coinciden, están vacíos, o contienen solo espacios en blanco.
4. WHEN el usuario completa los campos con contraseñas coincidentes y presiona el botón de envío, THE Sistema_Frontend SHALL enviar la solicitud de cambio de contraseña al Sistema_Backend con el `userId`, la contraseña temporal como `currentPassword`, y la nueva contraseña como `newPassword`.
5. WHEN el Sistema_Frontend recibe una respuesta exitosa del endpoint de cambio de contraseña (con token definitivo), THE Sistema_Frontend SHALL almacenar el token, actualizar el contexto de autenticación, cerrar el modal, y navegar al lobby.
6. IF el Sistema_Frontend recibe un error del endpoint de cambio de contraseña, THEN THE Sistema_Frontend SHALL mostrar un mensaje de error descriptivo correspondiente al código de error recibido del backend (por ejemplo, indicando contraseña actual incorrecta o nueva contraseña inválida) dentro del modal, sin cerrar el modal y permitiendo al usuario corregir los campos y reintentar.
7. WHILE el Modal_Cambio_Contraseña está visible, THE Sistema_Frontend SHALL impedir el cierre del modal por cualquier medio (clic fuera del modal, tecla Escape, u otro mecanismo de descarte) obligando al usuario a completar el cambio de contraseña.
8. WHILE la solicitud de cambio de contraseña está en curso, THE Sistema_Frontend SHALL deshabilitar el botón de envío y mostrar un indicador de carga hasta recibir la respuesta del Sistema_Backend, para prevenir envíos duplicados.
9. WHILE el Modal_Cambio_Contraseña está visible, THE Sistema_Frontend SHALL impedir la navegación a cualquier otra ruta de la aplicación hasta que el cambio de contraseña se complete exitosamente.

### Requisito 5: Seguridad del flujo de primer login

**User Story:** Como responsable de seguridad, quiero que el flujo de cambio de contraseña no exponga información sensible ni permita abusos, para mantener la integridad del sistema.

#### Criterios de Aceptación

1. THE Sistema_Backend SHALL limitar la respuesta del estado `'requires_password_change'` a solo el `userId` y el `status`, sin incluir tokens, roles, ni datos personales del usuario (nombre, email, workspace).
2. WHEN el usuario cambia la contraseña exitosamente, THE Sistema_Backend SHALL eliminar todas las sesiones de refresh asociadas al `userId` en la tabla de sesiones antes de emitir el token definitivo.
3. THE Modal_Cambio_Contraseña SHALL enmascarar los campos de contraseña (tipo `password`) para que el contenido no sea visible en pantalla.
4. IF un mismo `userId` realiza más de 5 intentos fallidos de cambio de contraseña en un período de 15 minutos, THEN THE Sistema_Backend SHALL responder con un código HTTP 429 y un mensaje de error indicando que se ha excedido el límite de intentos.
5. IF el usuario envía un `newPassword` idéntico a `currentPassword` en el endpoint de cambio de contraseña de primer login, THEN THE Sistema_Backend SHALL responder con un código HTTP 400 y el error `'password_must_be_different'`.
