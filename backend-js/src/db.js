require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'proyecto_iso',
  waitForConnections: true,
  connectionLimit: 10,
  // ensure proper UTF-8 handling including emojis and tildes
  charset: 'utf8mb4'
});

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    // Ensure connection uses utf8mb4 for names and collation
    try{ await conn.query("SET NAMES utf8mb4"); await conn.query("SET SESSION collation_connection = 'utf8mb4_unicode_ci'"); }catch(e){ console.error('failed to set utf8mb4 on connection', e) }
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection };