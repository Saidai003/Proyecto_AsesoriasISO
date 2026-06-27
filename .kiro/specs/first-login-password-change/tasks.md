# Implementation Plan: Cambio de Contraseña en Primer Login

## Overview

Implementación del flujo completo de cambio obligatorio de contraseña en primer inicio de sesión. Se comienza con validaciones en backend (creación de usuario, detección de estado en login, nuevo endpoint), seguido por la integración en frontend (modal, login, contexto de auth). Se finaliza con pruebas unitarias y de propiedad.

## Tasks

- [x] 1. Validación de contraseña en creación de usuario
  - [x] 1.1 Modificar `createUser` en `backend-js/src/controllers/userController.js` para validar el campo `password`
    - Agregar validación antes de la lógica existente de creación
    - Si `password` es undefined, null, vacío, o solo espacios → responder HTTP 400 con `{ error: 'password_required' }`
    - Si `password.trim().length < 8` → responder HTTP 400 con `{ error: 'password_too_short' }`
    - Si `password.length > 72` → responder HTTP 400 con `{ error: 'password_too_long' }`
    - Eliminar la lógica actual que permite `passwordValue = null` cuando no hay password
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.2 Escribir tests unitarios para validación de contraseña en `createUser`
    - Archivo: `backend-js/pruebas/unitarias/userController.test.js` (agregar nuevos casos)
    - Caso: password ausente → 400 `password_required`
    - Caso: password vacío/espacios → 400 `password_required`
    - Caso: password < 8 chars → 400 `password_too_short`
    - Caso: password > 72 chars → 400 `password_too_long`
    - Caso: password válido (8-72 chars) → 201 con id
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.3 Escribir test de propiedad para validación de contraseña en createUser
    - **Property 1: Validación de longitud de contraseña en createUser**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
    - Usar `fast-check` para generar cadenas arbitrarias y verificar que toda cadena inválida es rechazada con 400 y toda cadena válida es aceptada con 201

- [x] 2. Detección de estado Pendiente en login
  - [x] 2.1 Modificar `login` en `backend-js/src/controllers/authController.js` para detectar `estado_invitacion`
    - Agregar `estado_invitacion` al SELECT de la consulta de usuario existente
    - Después de validar credenciales (bcrypt.compare OK): verificar `estado_invitacion`
    - Si `estado_invitacion === 'Pendiente'` → responder HTTP 200 con `{ status: 'requires_password_change', userId: user.id }` (sin generar tokens)
    - Si `estado_invitacion === 'Expirada'` → responder HTTP 401 con `{ error: 'invalid_credentials' }`
    - Si `estado_invitacion === 'Aceptada'` → flujo normal existente (tokens, cookie, etc.)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.2 Escribir tests unitarios para detección de estado en login
    - Archivo: `backend-js/pruebas/unitarias/authController.test.js` (agregar nuevos casos)
    - Caso: usuario Pendiente + credenciales válidas → 200 con `requires_password_change`
    - Caso: usuario Aceptada + credenciales válidas → 200 con token
    - Caso: usuario Expirada + credenciales válidas → 401 genérico
    - Caso: credenciales inválidas (cualquier estado) → 401 sin revelar estado
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.3 Escribir test de propiedad para errores opacos al estado
    - **Property 4: Errores de credenciales son opacos al estado**
    - **Validates: Requirements 2.3, 2.4**
    - Usar `fast-check` para generar combinaciones de estado y credenciales inválidas, verificar que siempre se retorna el mismo error genérico

- [ ] 3. Endpoint de cambio de contraseña de primer login
  - [-] 3.1 Crear función `firstLoginPasswordChange` en `backend-js/src/controllers/authController.js`
    - Implementar rate limiting en memoria (Map con clave userId, máx 5 intentos en 15 min)
    - Extraer `{ userId, currentPassword, newPassword }` del body
    - Validar campos presentes y tipos
    - Validar longitud de `newPassword` (8-72 chars, no solo espacios)
    - Verificar que `newPassword !== currentPassword`
    - Buscar usuario por id, verificar que `estado_invitacion === 'Pendiente'`
    - Si `'Aceptada'` → HTTP 403 `already_activated`
    - Si usuario no existe → HTTP 404 `not_found`
    - Comparar `currentPassword` con `password_hash` almacenado
    - Incrementar rate limit en fallo; en éxito: limpiar contador
    - Hashear `newPassword` con bcrypt (10 rounds)
    - UPDATE `password_hash` y `estado_invitacion = 'Aceptada'`
    - DELETE todas las sessions del userId en tabla SESSIONS
    - Generar `accessToken` y crear nueva refresh session
    - Enviar cookie `refreshToken` y responder con `{ accessToken, user }`
    - Exportar `firstLoginPasswordChange` en el module.exports
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.4, 5.5_

  - [~] 3.2 Registrar ruta `POST /auth/first-login-password` en `backend-js/src/routes/auth.js`
    - Importar `firstLoginPasswordChange` desde `authController`
    - Registrar la ruta SIN middleware de autenticación (endpoint público)
    - _Requirements: 3.1_

  - [ ]* 3.3 Escribir tests unitarios para `firstLoginPasswordChange`
    - Archivo: `backend-js/pruebas/unitarias/authController.test.js` (agregar nuevos casos)
    - Caso éxito: Pendiente + credenciales válidas + newPassword válida → 200 con token
    - Caso: currentPassword incorrecta → 401
    - Caso: usuario ya activado → 403
    - Caso: usuario no encontrado → 404
    - Caso: newPassword vacío → 400 `new_password_required`
    - Caso: newPassword < 8 o > 72 → 400 `invalid_password_length`
    - Caso: newPassword === currentPassword → 400 `password_must_be_different`
    - Caso: rate limit excedido (6to intento) → 429
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.4, 5.5_

  - [ ]* 3.4 Escribir test de propiedad para validación de newPassword
    - **Property 6: Validación de newPassword en endpoint de primer login**
    - **Validates: Requirements 3.3, 3.5, 5.5**
    - Usar `fast-check` para generar cadenas arbitrarias como newPassword y verificar que toda cadena inválida es rechazada y el estado no cambia

  - [ ]* 3.5 Escribir test de propiedad para rate limiting
    - **Property 9: Rate limiting del endpoint de primer login**
    - **Validates: Requirements 5.4**
    - Usar `fast-check` para generar secuencias de N intentos fallidos y verificar que el 6to+ siempre retorna 429

- [~] 4. Checkpoint - Backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Modal de cambio de contraseña en frontend
  - [~] 5.1 Crear componente `ChangePasswordModal.jsx` en `frontend/src/components/`
    - Props: `userId`, `currentPassword`, `onSuccess`
    - Estado interno: `newPassword`, `confirmPassword`, `error`, `loading`
    - Modal no dismissible (sin cerrar con Escape, clic fuera, ni botón X)
    - Campos tipo `password` (enmascarados)
    - Botón deshabilitado si: campos vacíos, no coinciden, solo espacios, o loading
    - Al enviar: POST a `/auth/first-login-password` con `{ userId, currentPassword, newPassword }`
    - En éxito: invocar `onSuccess(response)`
    - En error: mostrar mensaje descriptivo según código de error del backend
    - Indicador de carga mientras la solicitud está en curso
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.3_

  - [~] 5.2 Modificar `Login.jsx` en `frontend/src/pages/Login.jsx` para manejar `requires_password_change`
    - Agregar estados: `pendingUserId` y `pendingPassword` (almacenados solo en memoria local del componente)
    - En `submit`: si la respuesta contiene `status === 'requires_password_change'`, guardar userId y password en estado local
    - Renderizar `<ChangePasswordModal>` condicionalmente cuando `pendingUserId !== null`
    - En `onSuccess` del modal: llamar a `setAuthFromResponse` del AuthContext y navegar a `/lobby`
    - Bloquear navegación mientras el modal es visible (listener `beforeunload`)
    - _Requirements: 4.1, 4.4, 4.5, 4.9_

  - [~] 5.3 Modificar `AuthContext.jsx` en `frontend/src/AuthContext.jsx`
    - Modificar función `login` para que retorne el body completo sin lanzar error cuando `status === 'requires_password_change'`
    - Agregar método `setAuthFromResponse(response)` que: almacene accessToken, decodifique el JWT, establezca user, y programe refresh
    - Exponer `setAuthFromResponse` en el Provider value
    - _Requirements: 4.5_

- [~] 6. Checkpoint - Frontend completo
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Tests de frontend
  - [ ]* 7.1 Escribir tests unitarios para `ChangePasswordModal`
    - Archivo: `frontend/src/components/ChangePasswordModal.test.jsx` (nuevo)
    - Verificar que el modal no se cierra con Escape
    - Verificar botón deshabilitado cuando contraseñas no coinciden
    - Verificar botón deshabilitado cuando campos vacíos
    - Verificar envío de solicitud correcta al presionar botón
    - Verificar mensaje de error mostrado al recibir error del backend
    - Verificar indicador de carga durante la solicitud
    - _Requirements: 4.2, 4.3, 4.6, 4.7, 4.8, 5.3_

  - [ ]* 7.2 Escribir tests unitarios para el flujo de Login con modal
    - Archivo: `frontend/src/pages/Login.test.jsx` (nuevo o existente)
    - Verificar que respuesta `requires_password_change` muestra el modal
    - Verificar que login normal (Aceptada) no muestra el modal
    - Verificar que onSuccess del modal llama a setAuthFromResponse y navega a /lobby
    - _Requirements: 4.1, 4.5_

- [~] 8. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using `fast-check`
- Unit tests validate specific examples and edge cases
- El rate limiting usa Map en memoria (single-instance); si se escala, migrar a Redis
- No se requieren cambios de esquema de BD — el campo `estado_invitacion` ya existe con los valores necesarios
- La contraseña temporal se mantiene solo en memoria de React (props del modal), nunca en localStorage/sessionStorage

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.4", "3.5"] },
    { "id": 3, "tasks": ["5.1", "5.3"] },
    { "id": 4, "tasks": ["5.2", "7.1"] },
    { "id": 5, "tasks": ["7.2"] }
  ]
}
```
