const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const { signAccessToken, createRefreshSession, getSession, revokeRefreshSession, REFRESH_TOKEN_MINUTES } = require('../auth');

function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', { path: '/' });
}

// ✅ Logging estructurado para errors de autenticación
const logAuthError = (context, error, details = {}) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    context,
    message: error?.message || String(error),
    code: error?.code || 'UNKNOWN',
    ...details
  };
  console.error('AUTH ERROR:', JSON.stringify(errorLog, null, 2));
};

const logAuthInfo = (context, message, details = {}) => {
  console.log(`[${context}]`, message, details);
};

async function login(req, res){
  try{
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

    // Validación de entrada
    if (!email || !password) {
      logAuthError('login', 'Missing credentials', { email: !!email, password: !!password, ip });
      return res.status(400).json({ error: 'email_and_password_required' });
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logAuthError('login', 'Invalid email format', { email, ip });
      return res.status(400).json({ error: 'invalid_email_format' });
    }

    const emailNorm = String(email).trim().toLowerCase();
    logAuthInfo('login', `Intento de login`, { email: emailNorm, ip });

    const [rows] = await pool.execute(
      'SELECT id, nombre, email, password_hash, role_id, workspace_id, estado_invitacion FROM USUARIOS WHERE email = ?',
      [emailNorm]
    );
    const user = rows[0];

    // Evitar timing attack usando bcrypt siempre
    if (!user || !user.password_hash) {
      // Siempre validar para no revelar si el usuario existe
      await bcrypt.compare(password, '$2a$10$dummyhash');
      logAuthError('login', 'Usuario no encontrado o sin contraseña', { email: emailNorm, userId: user?.id });
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      logAuthError('login', 'Contraseña incorrecta', { email: emailNorm, userId: user.id });
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Verificar estado_invitacion después de validar credenciales
    if (user.estado_invitacion === 'Pendiente') {
      logAuthInfo('login', 'Usuario pendiente de cambio de contraseña', { userId: user.id, email: emailNorm });
      return res.status(200).json({ status: 'requires_password_change', userId: user.id });
    }

    if (user.estado_invitacion === 'Expirada') {
      logAuthError('login', 'Invitación expirada', { email: emailNorm, userId: user.id });
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Validar que el usuario tenga workspace asignado
    let roleName = 'User';
    if (user.role_id) {
      const [r] = await pool.execute('SELECT nombre FROM ROLES WHERE id = ?', [user.role_id]);
      if (r[0] && r[0].nombre) roleName = r[0].nombre;
    }

    if (!user.workspace_id && roleName !== 'Admin') {
      logAuthError('login', 'Usuario sin workspace asignado', { userId: user.id, role: roleName });
      return res.status(403).json({ error: 'workspace_required', message: 'Usuario no tiene workspace asignado' });
    }

    // Generar tokens
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: roleName, workspace_id: user.workspace_id });
    const refreshToken = await createRefreshSession(user.id);

    const cookieSecure = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,                              // JS del browser NO puede leer esta cookie (protege contra XSS)
      sameSite: 'strict',                          // Cookie NO se envía en requests de otro dominio (protege contra CSRF)
      secure: cookieSecure,                        // Solo viaja por HTTPS; false en dev porque localhost no tiene HTTPS
      maxAge: REFRESH_TOKEN_MINUTES * 60 * 1000,   // Tiempo de vida en ms (24h default); tras esto el browser la elimina
      path: '/'                                    // Disponible para todas las rutas del dominio (necesaria en /auth/refresh y /auth/logout)
    });

    logAuthInfo('login', `Login exitoso`, { userId: user.id, email: emailNorm, workspace: user.workspace_id });
    return res.json({
      accessToken,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: roleName, workspace_id: user.workspace_id }
    });
  } catch (err) {
    logAuthError('login', err, { endpoint: 'POST /auth/login' });
    return res.status(500).json({ error: 'internal_server_error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

async function refresh(req, res){
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  try{
    const token = req.cookies?.refreshToken;

    // Validar que el token existe
    if (!token) {
      logAuthError('refresh', 'No refresh token en cookie', { cookies: !!req.cookies, ip });
      return res.status(401).json({ error: 'no_refresh_token' });
    }

    logAuthInfo('refresh', 'Validando refresh token');

    // Buscar sesión válida (con timeout)
    const session = await Promise.race([
      getSession(token),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 5000))
    ]);

    if (!session) {
      logAuthError('refresh', 'Sesión de refresh no válida o expirada', { token: token.substring(0, 10) + '...', ip });
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ error: 'refresh_token_expired' });
    }

    // Buscar usuario
    const [rows] = await pool.execute(
      'SELECT id, email, nombre, role_id, workspace_id FROM USUARIOS WHERE id = ?',
      [session.user_id]
    );
    const user = rows[0];

    if (!user) {
      logAuthError('refresh', 'Usuario no encontrado en refresh', { userId: session.user_id, ip });
      res.clearCookie('refreshToken', { path: '/' });
      return res.status(401).json({ error: 'user_not_found' });
    }

    // Resolver role
    let roleName = 'User';
    if (user.role_id) {
      const [r] = await pool.execute('SELECT nombre FROM ROLES WHERE id = ?', [user.role_id]);
      if (r[0] && r[0].nombre) roleName = r[0].nombre;
    }

    // Generar nuevo access token
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: roleName,
      workspace_id: user.workspace_id
    });

    logAuthInfo('refresh', 'Token refrescado exitosamente', { userId: user.id, email: user.email });
    return res.json({ accessToken });
  } catch (err) {
    logAuthError('refresh', err, { endpoint: 'POST /auth/refresh', ip });
    res.clearCookie('refreshToken', { path: '/' });
    return res.status(500).json({ error: 'refresh_failed', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

async function logout(req, res){
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
  try{
    const token = req.cookies?.refreshToken;
    const userId = req.user?.id; // Si hay middleware de autenticación

    if (token) {
      try {
        logAuthInfo('logout', 'Revocando sesión de refresh');
        await revokeRefreshSession(token);
      } catch (err) {
        logAuthError('logout', 'Error al revocar sesión', { token: token.substring(0, 10) + '...', error: err.message });
        // Continuar con logout local incluso si falla revocar
      }
    }

    // Limpiar cookie
    clearRefreshTokenCookie(res);
    logAuthInfo('logout', 'Logout completado', { userId, ip });
    return res.json({ ok: true });
  } catch (err) {
    logAuthError('logout', err, { endpoint: 'POST /auth/logout', ip });
    clearRefreshTokenCookie(res);
    // Siempre responder OK en logout para limpiar client
    return res.status(500).json({ ok: true, error: 'server_error_but_cleared' });
  }
}

// ─── Rate Limiting para firstLoginPasswordChange ───
const rateLimitMap = new Map(); // Map<userId, { attempts, firstAttemptAt }>
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function checkRateLimit(userId) {
  const entry = rateLimitMap.get(userId);
  if (!entry) return false; // No limitado

  // Si la ventana expiró, limpiar y permitir
  if (Date.now() - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.delete(userId);
    return false;
  }

  return entry.attempts >= RATE_LIMIT_MAX_ATTEMPTS;
}

function incrementRateLimit(userId) {
  const entry = rateLimitMap.get(userId);
  if (!entry || Date.now() - entry.firstAttemptAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { attempts: 1, firstAttemptAt: Date.now() });
  } else {
    entry.attempts += 1;
  }
}

function clearRateLimit(userId) {
  rateLimitMap.delete(userId);
}

async function firstLoginPasswordChange(req, res) {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    // Validar campos presentes y tipos
    if (!userId || typeof userId !== 'number') {
      return res.status(400).json({ error: 'invalid_user_id' });
    }
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'invalid_current_password' });
    }
    if (
      newPassword === undefined ||
      newPassword === null ||
      typeof newPassword !== 'string' ||
      newPassword.trim().length === 0
    ) {
      return res.status(400).json({ error: 'new_password_required' });
    }

    // Validar longitud de newPassword (8-72 chars)
    if (newPassword.length < 8 || newPassword.length > 72) {
      return res.status(400).json({ error: 'invalid_password_length' });
    }

    // Verificar que newPassword !== currentPassword
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'password_must_be_different' });
    }

    // Rate limiting check
    if (checkRateLimit(userId)) {
      return res.status(429).json({ error: 'too_many_attempts' });
    }

    // Buscar usuario por id
    const [rows] = await pool.execute(
      'SELECT id, nombre, email, password_hash, role_id, workspace_id, estado_invitacion FROM USUARIOS WHERE id = ?',
      [userId]
    );
    const user = rows[0];

    // Si usuario no existe
    if (!user) {
      return res.status(404).json({ error: 'not_found' });
    }

    // Verificar estado_invitacion
    if (user.estado_invitacion === 'Aceptada') {
      return res.status(403).json({ error: 'already_activated' });
    }

    if (user.estado_invitacion !== 'Pendiente') {
      return res.status(404).json({ error: 'not_found' });
    }

    // Comparar currentPassword con password_hash almacenado
    if (!user.password_hash) {
      incrementRateLimit(userId);
      return res.status(401).json({ error: 'invalid_current_password' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      incrementRateLimit(userId);
      return res.status(401).json({ error: 'invalid_current_password' });
    }

    // Éxito: limpiar rate limit
    clearRateLimit(userId);

    // Hashear newPassword con bcrypt (10 rounds)
    const newHash = await bcrypt.hash(newPassword, 10);

    // UPDATE password_hash y estado_invitacion = 'Aceptada'
    await pool.execute(
      'UPDATE USUARIOS SET password_hash = ?, estado_invitacion = ? WHERE id = ?',
      [newHash, 'Aceptada', userId]
    );

    // DELETE todas las sessions del userId
    await pool.execute('DELETE FROM SESSIONS WHERE user_id = ?', [userId]);

    // Resolver roleName
    let roleName = 'User';
    if (user.role_id) {
      const [r] = await pool.execute('SELECT nombre FROM ROLES WHERE id = ?', [user.role_id]);
      if (r[0] && r[0].nombre) roleName = r[0].nombre;
    }

    // Generar accessToken y crear nueva refresh session
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: roleName,
      workspace_id: user.workspace_id
    });
    const refreshToken = await createRefreshSession(user.id);

    // Enviar cookie refreshToken (misma configuración que login)
    const cookieSecure = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: cookieSecure,
      maxAge: REFRESH_TOKEN_MINUTES * 60 * 1000,
      path: '/'
    });

    logAuthInfo('firstLoginPasswordChange', 'Cambio de contraseña exitoso', { userId: user.id, email: user.email });
    return res.json({
      accessToken,
      user: { id: user.id, nombre: user.nombre, email: user.email, role: roleName, workspace_id: user.workspace_id }
    });
  } catch (err) {
    logAuthError('firstLoginPasswordChange', err, { endpoint: 'POST /auth/first-login-password' });
    return res.status(500).json({ error: 'internal_server_error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
}

module.exports = { login, refresh, logout, firstLoginPasswordChange };
