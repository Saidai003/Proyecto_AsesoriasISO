const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const { signAccessToken, createRefreshSession, getSession, revokeRefreshSession, REFRESH_TOKEN_MINUTES } = require('../auth');

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
    const ip = req.ip || req.connection.remoteAddress;

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
      'SELECT id, nombre, email, password_hash, role_id, workspace_id FROM USUARIOS WHERE email = ?',
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

    const cookieSecure = process.env.NODE_ENV === 'production'; // ✅ Seguro en producción
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: cookieSecure,
      maxAge: REFRESH_TOKEN_MINUTES * 60 * 1000,
      path: '/'
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
  const ip = req.ip || req.connection.remoteAddress;
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
  const ip = req.ip || req.connection.remoteAddress;
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
    res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict' });
    logAuthInfo('logout', 'Logout completado', { userId, ip });
    return res.json({ ok: true, message: 'Logout exitoso' });
  } catch (err) {
    logAuthError('logout', err, { endpoint: 'POST /auth/logout', ip });
    res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'strict' });
    // Siempre responder OK en logout para limpiar client
    return res.status(500).json({ ok: true, error: 'server_error_but_cleared' });
  }
}

module.exports = { login, refresh, logout };
