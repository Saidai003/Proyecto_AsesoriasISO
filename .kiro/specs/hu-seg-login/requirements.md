# Requirements: HU-SEG-LOGIN - Inicio de Sesión Seguro

## Introduction

El sistema de autenticación permite a los usuarios acceder a la plataforma mediante email y contraseña. Implementa JWT + refresh token con cookie HttpOnly para mantener sesiones seguras y persistentes.

## Requirements

### Requirement 1: Formulario de Login (CA-001)

**User Story:** Como usuario, quiero ingresar mi email y contraseña para acceder a la plataforma.

#### Acceptance Criteria

1. La página de login muestra campos de email y contraseña.
2. Se usa react-hook-form para el manejo del formulario.
3. Un botón "Ingresar" envía las credenciales al backend.
4. Mensajes de error se muestran inline bajo el formulario.

### Requirement 2: Validación de Credenciales (CA-002)

**User Story:** Como sistema, quiero validar las credenciales del usuario para asegurar que solo personas autorizadas accedan.

#### Acceptance Criteria

1. El email se normaliza (lowercase, trim) antes de buscar en DB.
2. Se valida formato de email con regex básica.
3. Si el usuario no existe, se ejecuta bcrypt.compare contra un hash dummy (mitigación de timing attack).
4. Si la contraseña es incorrecta, retorna 401 `invalid_credentials` (sin revelar si el email existe).
5. Si el estado es "Pendiente", retorna 200 `requires_password_change` con userId (redirige a activación).
6. Si el estado es "Expirada", retorna 401 `invalid_credentials`.
7. Para usuarios no-Admin sin workspace asignado, retorna 403 `workspace_required`.

### Requirement 3: Generación de JWT (CA-003)

**User Story:** Como sistema, quiero generar un token de acceso JWT al autenticar exitosamente, para autorizar requests subsiguientes.

#### Acceptance Criteria

1. El JWT se firma con HS256 usando JWT_SECRET (obligatorio en producción).
2. Expira en 30 minutos.
3. Payload contiene: `{ id, email, role, workspace_id }`.
4. Se retorna en el body de la respuesta como `accessToken`.

### Requirement 4: Generación de Refresh Token (CA-004)

**User Story:** Como sistema, quiero generar un refresh token para permitir renovar sesiones sin re-login.

#### Acceptance Criteria

1. El refresh token es un UUID aleatorio (crypto.randomUUID()).
2. Se almacena en tabla SESSIONS con user_id y expires_at.
3. Vida configurable via REFRESH_TOKEN_MINUTES (default 1440 = 24h).

### Requirement 5: Almacenamiento del Refresh Token (CA-005)

**User Story:** Como sistema, quiero almacenar el refresh token de forma segura en la base de datos.

#### Acceptance Criteria

1. El token se guarda en la tabla SESSIONS (id, user_id, token UNIQUE, expires_at, created_at).
2. Solo se retornan sesiones no expiradas (WHERE expires_at > NOW()).
3. Al hacer logout, el token se elimina de la tabla.

### Requirement 6: Cookie HttpOnly (CA-006)

**User Story:** Como sistema, quiero enviar el refresh token en una cookie HttpOnly para que no sea accesible por JavaScript del cliente.

#### Acceptance Criteria

1. La cookie tiene flag `httpOnly: true` (no accesible por JS).
2. La cookie tiene flag `sameSite: 'strict'` (previene CSRF).
3. En producción, la cookie tiene flag `secure: true` (solo HTTPS).
4. El maxAge corresponde a REFRESH_TOKEN_MINUTES.
5. El path es `/` (disponible en toda la app).

### Requirement 7: Redirección al Workspace (CA-007)

**User Story:** Como usuario autenticado, quiero ser redirigido a mi workspace asignado tras el login.

#### Acceptance Criteria

1. Tras login exitoso, el frontend navega a `/lobby`.
2. El componente Protected verifica que el usuario tenga workspace asignado.
3. Si no tiene workspace y no es Admin, muestra mensaje "sin workspace asignado".
4. Si es Admin sin workspace, puede acceder normalmente.

### Requirement 8: Validaciones Backend (CA-010)

**User Story:** Como sistema, quiero validar todas las entradas del endpoint de login para prevenir ataques.

#### Acceptance Criteria

1. Email y password son obligatorios (400 si faltan).
2. El email debe pasar validación regex básica (400 si no).
3. Se loguean todos los intentos fallidos con IP y contexto.
4. No se revela si el email existe o no en mensajes de error.

### Requirement 9: Persistencia de Sesión (RF-AUTH-3)

**User Story:** Como usuario, quiero que mi sesión se mantenga activa sin re-login frecuente.

#### Acceptance Criteria

1. El frontend programa refresh automático 60s antes de expirar el JWT.
2. Si el refresh falla, se limpia el estado y se redirige a login.
3. El refresh se pausa cuando el usuario está idle (react-idle-timer).
4. El access token se guarda en localStorage; el refresh en cookie HttpOnly.

### Requirement 10: Logout

**User Story:** Como usuario, quiero cerrar mi sesión de forma segura.

#### Acceptance Criteria

1. POST /auth/logout revoca el refresh token de la tabla SESSIONS.
2. Se limpia la cookie refreshToken.
3. El frontend limpia localStorage (accessToken, user).
4. Se redirige a /login.
