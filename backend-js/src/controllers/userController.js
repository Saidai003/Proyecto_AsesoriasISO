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

async function listUsers(req, res){
  try{
    const [rows] = await pool.execute('SELECT id, nombre, email, role_id, workspace_id FROM USUARIOS');
    return res.json(rows);
  }catch(err){
    console.error('listUsers error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { createUser, listUsers };
