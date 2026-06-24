const { pool } = require('../db');
const bcrypt = require('bcryptjs');

async function createUser(req, res){
  try{
    const { nombre, email, password, workspace_id, role_id } = req.body;
    if (!nombre || !email || typeof workspace_id === 'undefined' || typeof role_id === 'undefined') return res.status(400).json({ error: 'nombre, email, workspace_id and role_id are required' });
    const emailNorm = String(email).trim().toLowerCase();
    const passwordValue = typeof password === 'string' && password.trim() !== '' ? password : null;
    // explicit pre-check to provide a friendly 409 when email already exists
    const [existing] = await pool.execute('SELECT id FROM USUARIOS WHERE email = ?', [emailNorm]);
    if(existing && existing.length) return res.status(409).json({ error: 'email_exists' });
    // validate referenced workspace and role exist
    const [wrows] = await pool.execute('SELECT id FROM ESPACIO_TRABAJO WHERE id = ?', [workspace_id]);
    if(!wrows || !wrows.length) return res.status(404).json({ error: 'workspace_not_found' });
    const [rrows] = await pool.execute('SELECT id FROM ROLES WHERE id = ?', [role_id]);
    if(!rrows || !rrows.length) return res.status(404).json({ error: 'role_not_found' });
    const password_hash = passwordValue ? await bcrypt.hash(passwordValue, 10) : null;
    // When admin creates a user (even if providing a temporary password), the user
    // must change their password themselves to activate the account. Therefore
    // new users created by admin are always 'Pendiente'.
    const estado = 'Pendiente';
    const [result] = await pool.execute(
      `INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [workspace_id, role_id, nombre, emailNorm, password_hash, estado]
    );
    return res.status(201).json({ id: result.insertId });
  }catch(err){
    console.error('createUser error', err);
    if(err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'email_exists' });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateUser(req, res){
  try{
    const id = req.params.id;
    const { nombre, email, password, workspace_id = null, role_id = null } = req.body;
    console.log('updateUser called with body', req.body);
    console.log('updateUser called with', { id, nombre, email, workspace_id, role_id, hasPassword: !!password });
    // Ensure no undefined values are passed to SQL driver
    const pNombre = typeof nombre === 'undefined' ? null : nombre;
    // normalize email when provided to keep canonical form in DB
    const pEmail = typeof email === 'undefined' ? null : (String(email).trim().toLowerCase());
    const pWorkspace = typeof workspace_id === 'undefined' ? null : workspace_id;
    const pRole = typeof role_id === 'undefined' ? null : role_id;
    const pId = typeof id === 'undefined' ? null : id;
    let query = 'UPDATE USUARIOS SET nombre = ?, email = ?, workspace_id = ?, role_id = ? WHERE id = ?';
    let params = [pNombre, pEmail, pWorkspace, pRole, pId];
    if(password){
      const hash = await bcrypt.hash(password, 10);
      // If an admin updates a user's password, the user must still change it
      // themself after the admin reset. Mark state as 'Pendiente'.
      query = 'UPDATE USUARIOS SET nombre = ?, email = ?, workspace_id = ?, role_id = ?, password_hash = ?, estado_invitacion = ? WHERE id = ?';
      params = [pNombre, pEmail, pWorkspace, pRole, hash, 'Pendiente', pId];
    }
    console.log('updateUser executing', { query, params });
    await pool.execute(query, params);
    return res.json({ ok: true });
  }catch(err){
    console.error('updateUser error', err);
    if(err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'email_exists' });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateUserPassword(req, res){
  try{
    const id = Number(req.params.id);
    if(!id) return res.status(400).json({ error: 'id_required' });
    if(!req.user || Number(req.user.id) !== id) return res.status(403).json({ error: 'forbidden' });

    const { currentPassword, password } = req.body;
    if(!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ error: 'password_required' });
    }
    if(!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ error: 'current_password_required' });
    }

    const [rows] = await pool.execute('SELECT password_hash FROM USUARIOS WHERE id = ?', [id]);
    if(!rows.length) return res.status(404).json({ error: 'not_found' });

    const validPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if(!validPassword) return res.status(401).json({ error: 'invalid_current_password' });

    const newHash = await bcrypt.hash(password, 10);
    await pool.execute('UPDATE USUARIOS SET password_hash = ?, estado_invitacion = ? WHERE id = ?', [newHash, 'Aceptada', id]);
    return res.json({ ok: true });
  }catch(err){
    console.error('updateUserPassword error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function deleteUser(req, res){
  try{
    const id = req.params.id;
    if(!id) return res.status(400).json({ error: 'id required' });
    await pool.execute('DELETE FROM USUARIOS WHERE id = ?', [id]);
    return res.json({ id });
  }catch(err){
    console.error('deleteUser error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function getUser(req, res){
  try{
    const id = req.params.id;
    const [rows] = await pool.execute('SELECT id, nombre, email, role_id, workspace_id, estado_invitacion FROM USUARIOS WHERE id = ?', [id]);
    if(!rows.length) return res.status(404).json({ error: 'not_found' });
    return res.json(rows[0]);
  }catch(err){ return res.status(500).json({ error: 'internal_error' }) }
}

async function listUsers(req, res){
  try{
    const [rows] = await pool.execute('SELECT id, nombre, email, role_id, workspace_id, estado_invitacion FROM USUARIOS');
    return res.json(rows);
  }catch(err){
    console.error('listUsers error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function listResponsables(req, res){
  try{
    const [rows] = await pool.execute(
      `SELECT u.id, u.nombre, u.email FROM USUARIOS u JOIN ROLES r ON u.role_id = r.id WHERE r.nombre = ?`,
      ['Responsable SGC']
    );
    return res.json(rows);
  }catch(err){
    console.error('listResponsables error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function assignUserToWorkspace(req, res){
  try{
    const id = req.params.id;
    const { workspace_id } = req.body;
    if(!id) return res.status(400).json({ error: 'id required' });
    // allow null to unassign
    if(typeof workspace_id !== 'undefined' && workspace_id !== null){
      const [wrows] = await pool.execute('SELECT id FROM ESPACIO_TRABAJO WHERE id = ?', [workspace_id]);
      if(!wrows.length) return res.status(404).json({ error: 'workspace_not_found' });
    }
    await pool.execute('UPDATE USUARIOS SET workspace_id = ? WHERE id = ?', [workspace_id || null, id]);
    return res.json({ ok: true });
  }catch(err){
    console.error('assignUserToWorkspace error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { createUser, updateUser, updateUserPassword, deleteUser, getUser, listUsers, assignUserToWorkspace, listResponsables };