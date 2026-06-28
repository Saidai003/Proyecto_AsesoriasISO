const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const crypto = require('crypto');

// Validar JWT_SECRET en producción
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'dev_jwt_secret') {
  throw new Error('CRITICAL: JWT_SECRET must be set in production. Set JWT_SECRET environment variable.');
}

// Refresh token lifetime in minutes (24 hours)
const REFRESH_TOKEN_MINUTES = Number(process.env.REFRESH_TOKEN_MINUTES || 1440);
const REFRESH_TOKEN_EXP_DAYS = REFRESH_TOKEN_MINUTES / 1440;

// Logging
const logAuthInfo = (context, message) => {
  console.log(`[${context}]`, message);
};
const logAuthError = (context, error, details = {}) => {
  console.error(`[${context}] ERROR:`, error?.message || String(error), details);
};

function signAccessToken(payload){
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be a non-empty object');
    }
    if (!payload.id || !payload.email) {
      throw new Error('Payload must include id and email');
    }
    logAuthInfo('signAccessToken', `Generando token para usuario ${payload.id}`);
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30m' });
  } catch (err) {
    logAuthError('signAccessToken', err);
    throw err;
  }
}

function verifyAccessToken(token){
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    logAuthError('verifyAccessToken', err, { tokenLength: token?.length });
    throw err;
  }
}

async function createRefreshSession(userId){
  try {
    if (!userId || typeof userId !== 'number') {
      throw new Error('userId must be a valid number');
    }
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + REFRESH_TOKEN_MINUTES * 60 * 1000);

    logAuthInfo('createRefreshSession', `Creando sesión de refresh para usuario ${userId}`);
    
    await pool.execute(
      'INSERT INTO SESSIONS (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expires_at]
    );
    return token;
  } catch (err) {
    logAuthError('createRefreshSession', err, { userId });
    throw err;
  }
}

async function revokeRefreshSession(token){
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }
    logAuthInfo('revokeRefreshSession', `Revocando sesión: ${token.substring(0, 10)}...`);
    const [result] = await pool.execute('DELETE FROM SESSIONS WHERE token = ?', [token]);
    
    if (result.affectedRows === 0) {
      logAuthError('revokeRefreshSession', 'Token no encontrado o ya expirado', { token: token.substring(0, 10) + '...' });
    }
  } catch (err) {
    logAuthError('revokeRefreshSession', err, { token: token?.substring(0, 10) + '...' });
    throw err;
  }
}

async function getSession(token){
  try {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }
    const [rows] = await pool.execute('SELECT * FROM SESSIONS WHERE token = ? AND expires_at > NOW()', [token]);
    
    if (!rows[0]) {
      logAuthError('getSession', 'Sesión no encontrada o expirada', { token: token.substring(0, 10) + '...' });
    } else {
      logAuthInfo('getSession', `Sesión válida encontrada para usuario ${rows[0].user_id}`);
    }
    return rows[0];
  } catch (err) {
    logAuthError('getSession', err, { token: token?.substring(0, 10) + '...' });
    throw err;
  }
}
module.exports = { signAccessToken, verifyAccessToken, createRefreshSession, revokeRefreshSession, getSession, REFRESH_TOKEN_MINUTES };
