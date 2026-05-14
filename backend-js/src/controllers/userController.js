const { pool } = require('../db');
const bcrypt = require('bcryptjs');

async function createUser(req, res){
  try{
    const { nombre, email, password, workspace_id, role_id } = req.body;
    if (!nombre || !email || !password || typeof workspace_id === 'undefined' || typeof role_id === 'undefined') return res.status(400).json({ error: 'nombre, email, password, workspace_id and role_id are required' });
    const emailNorm = String(email).trim().toLowerCase();
    // explicit pre-check to provide a friendly 409 when email already exists
    const [existing] = await pool.execute('SELECT id FROM USUARIOS WHERE email = ?', [emailNorm]);
    if(existing && existing.length) return res.status(409).json({ error: 'email_exists' });
    // validate referenced workspace and role exist
    const [wrows] = await pool.execute('SELECT id FROM ESPACIO_TRABAJO WHERE id = ?', [workspace_id]);
    if(!wrows || !wrows.length) return res.status(404).json({ error: 'workspace_not_found' });
    const [rrows] = await pool.execute('SELECT id FROM ROLES WHERE id = ?', [role_id]);
    if(!rrows || !rrows.length) return res.status(404).json({ error: 'role_not_found' });
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [workspace_id, role_id, nombre, emailNorm, password_hash, 'Pendiente']
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
      query = 'UPDATE USUARIOS SET nombre = ?, email = ?, workspace_id = ?, role_id = ?, password_hash = ? WHERE id = ?';
      params = [pNombre, pEmail, pWorkspace, pRole, hash, pId];
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
    const [rows] = await pool.execute('SELECT id, nombre, email, role_id, workspace_id FROM USUARIOS WHERE id = ?', [id]);
    if(!rows.length) return res.status(404).json({ error: 'not_found' });
    return res.json(rows[0]);
  }catch(err){ return res.status(500).json({ error: 'internal_error' }) }
}

async function listUsers(req, res){
  try{
    const [rows] = await pool.execute('SELECT id, nombre, email, role_id, workspace_id FROM USUARIOS');
    return res.json(rows);
  }catch(err){
    console.error('listUsers error', err);
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

module.exports = { createUser, updateUser, deleteUser, getUser, listUsers, assignUserToWorkspace };