const { pool } = require('../db');
const bcrypt = require('bcryptjs');

async function seed(req, res){
  try{
    if(process.env.NODE_ENV !== 'development' && req.body.secret !== process.env.SEED_SECRET){
      return res.status(403).json({ error: 'forbidden' });
    }
    // Create tables if not exist
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS WORKSPACES (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL
      ) ENGINE=InnoDB;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ROLES (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      ) ENGINE=InnoDB;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS SESSIONS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT NOW()
      ) ENGINE=InnoDB;
    `);
    // Ensure unique email index
    try{
      await pool.execute('ALTER TABLE USUARIOS ADD UNIQUE INDEX ux_usuarios_email (email)');
    }catch(e){ /* ignore if exists */ }

    // Insert roles
    await pool.execute('INSERT IGNORE INTO ROLES (name) VALUES (?), (?), (?)', ['Admin','Evaluador','Responsable SGC']);
    // Insert workspace
    await pool.execute('INSERT IGNORE INTO WORKSPACES (id, name) VALUES (1, ?)', ['Workspace Demo']);

    // Insert users with password 'Password123!'
    const pwd = 'Password123!';
    const h1 = await bcrypt.hash(pwd, 10);
    const h2 = await bcrypt.hash(pwd, 10);
    const h3 = await bcrypt.hash(pwd, 10);

    // Resolve role ids
    const [rRows] = await pool.execute('SELECT id, name FROM ROLES');
    const roleMap = {};
    rRows.forEach(r => roleMap[r.name] = r.id);

    await pool.execute(
      `INSERT IGNORE INTO USUARIOS (id, workspace_id, role_id, nombre, email, password_hash, estado_invitacion, fecha_registro)
       VALUES
       (1, NULL, ?, 'Admin Demo', 'admin@demo.local', ?, 'Activo', NOW()),
       (2, 1, ?, 'Evaluador Demo', 'evaluador@demo.local', ?, 'Activo', NOW()),
       (3, 1, ?, 'Responsable Demo', 'responsable@demo.local', ?, 'Activo', NOW())`,
      [roleMap['Admin'] || null, h1, roleMap['Evaluador'] || null, h2, roleMap['Responsable SGC'] || null, h3]
    );

    return res.json({ ok: true });
  }catch(err){
    console.error('seed error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { seed };
