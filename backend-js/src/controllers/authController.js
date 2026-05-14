const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const { signAccessToken, createRefreshSession, getSession, revokeRefreshSession, REFRESH_TOKEN_MINUTES } = require('../auth');

async function login(req, res){
  try{
    const { email, password } = req.body;
    if(!email || !password) return res.status(400).json({ error: 'email and password required' });
    const emailNorm = String(email).trim().toLowerCase();
    const [rows] = await pool.execute('SELECT id, nombre, email, password_hash, role_id, workspace_id FROM USUARIOS WHERE email = ?', [emailNorm]);
    const user = rows[0];
    if(!user) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({ error: 'invalid_credentials' });
    
    // Resolve role name if ROLES table exists
    let roleName = 'User';
    if(user.role_id){
      const [r] = await pool.execute('SELECT nombre FROM ROLES WHERE id = ?', [user.role_id]);
      if(r[0] && r[0].nombre) roleName = r[0].nombre;
    }
    // require workspace assignment for non-admin users
    if(!user.workspace_id && roleName !== 'Admin') return res.status(403).json({ error: 'workspace_required', message: 'Usuario no tiene un espacio de trabajo asignado' });
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: roleName, workspace_id: user.workspace_id });
    const refreshToken = await createRefreshSession(user.id);
    // Cookie maxAge should match the refresh session lifetime (in ms)
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: REFRESH_TOKEN_MINUTES * 60 * 1000 });
    return res.json({ accessToken, user: { id: user.id, nombre: user.nombre, role: roleName, workspace_id: user.workspace_id } });
  }catch(err){
    console.error('login error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function refresh(req, res){
  try{
    const token = req.cookies && req.cookies.refreshToken;
    if(!token) return res.status(401).json({ error: 'no_refresh' });
    const session = await getSession(token);
    if(!session) return res.status(401).json({ error: 'invalid_refresh' });
    const [rows] = await pool.execute('SELECT id, email, nombre, role_id, workspace_id FROM USUARIOS WHERE id = ?', [session.user_id]);
    const user = rows[0];
    if(!user) return res.status(401).json({ error: 'invalid_refresh' });
    let roleName = 'User';
    if(user.role_id){
      const [r] = await pool.execute('SELECT nombre FROM ROLES WHERE id = ?', [user.role_id]);
      if(r[0] && r[0].nombre) roleName = r[0].nombre;
    }
    const accessToken = signAccessToken({ id: user.id, email: user.email, role: roleName, workspace_id: user.workspace_id });
    return res.json({ accessToken });
  }catch(err){
    console.error('refresh error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function logout(req, res){
  try{
    const token = req.cookies && req.cookies.refreshToken;
    if(token) await revokeRefreshSession(token);
    res.clearCookie('refreshToken');
    return res.json({ ok: true });
  }catch(err){
    console.error('logout error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { login, refresh, logout };
