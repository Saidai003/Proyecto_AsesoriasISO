const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const { v4: uuidv4 } = require('uuid');

// dev_jwt_secret is a placeholder secret for development.
// In other words, it's not secure. In production, use a strong, unique secret
// and keep it safe (e.g. in environment variables or a secrets manager).
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const REFRESH_TOKEN_EXP_DAYS = 30;

function signAccessToken(payload){
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

function verifyAccessToken(token){
    return jwt.verify(token, JWT_SECRET);
}

async function createRefreshSession(userId){
    const token = uuidv4();
    const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXP_DAYS * 24 * 60 * 60 * 1000);

    // Safe method to store refresh tokens in DB (using parameterized queries to prevent SQL injection).
    // See SOURCES.md -> backend-js/src/index.js for references on security and implementation choices.
    await pool.execute(
        'INSERT INTO SESSIONS (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, expires_at]
    );
    return token;
}

async function revokeRefreshSession(token){
    await pool.execute('DELETE FROM SESSIONS WHERE token = ?', [token]);
}

async function getSession(token){
    const [rows] = await pool.execute('SELECT * FROM SESSIONS WHERE token = ? AND expires_at > NOW()', [token]);
    return rows[0];
}
module.exports = { signAccessToken, verifyAccessToken, createRefreshSession, revokeRefreshSession, getSession };