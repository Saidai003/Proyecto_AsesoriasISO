const { pool } = require('../db');
const { verifyAccessToken } = require('../auth');

async function getAuthUser(req, res) {
  const requestUser = req.user;
  const token = req.headers?.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : req.query?.token;

  if (requestUser?.id && requestUser.workspace_id && requestUser.role) {
    return requestUser;
  }

  if (!requestUser?.id && !token) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }

  let user = requestUser || null;
  if (!user?.id) {
    try {
      user = verifyAccessToken(token);
    } catch (e) {
      res.status(401).json({ error: 'invalid_token' });
      return null;
    }
  }

  if (user?.id && user.workspace_id && user.role) {
    return user;
  }

  if (!user?.id) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }

  try {
    const [rows] = await pool.execute(`
      SELECT u.workspace_id, u.role_id, r.nombre as rol_nombre 
      FROM USUARIOS u 
      LEFT JOIN ROLES r ON u.role_id = r.id 
      WHERE u.id = ?`, 
      [user.id]
    );
    if (!rows?.[0]) {
      res.status(404).json({ error: 'user_not_found' });
      return null;
    }
    return { id: user.id, ...rows[0] };
  } catch (e) {
    console.error('getAuthUser error', e);
    res.status(500).json({ error: 'internal' });
    return null;
  }
}

module.exports = { getAuthUser };