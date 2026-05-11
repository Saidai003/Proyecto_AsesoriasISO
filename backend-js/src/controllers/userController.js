const { pool } = require('../db');
const bcrypt = require('bcryptjs');

async function createUser(req, res){
  try{
    const { nombre, email, password, workspace_id = null, role_id = null } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'nombre, email and password are required' });
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO USUARIOS (workspace_id, role_id, nombre, email, password_hash, estado_invitacion, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [workspace_id, role_id, nombre, email, password_hash, 'Pendiente']
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
    const { nombre, email, password, workspace_id, role_id } = req.body;
    await pool.execute(
      'UPDATE USUARIOS SET nombre = ?, email = ?, workspace_id = ?, role_id = ?' + (password ? ', password_hash = ?' : '') + ' WHERE id = ?',
      password ? [nombre, email, workspace_id, role_id, await bcrypt.hash(password, 10), id] : [nombre, email, workspace_id, role_id, id]
    );
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