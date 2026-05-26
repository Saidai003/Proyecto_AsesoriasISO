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
  // Try to obtain a connection with retry logic to handle DB cold-starts or transient network issues
  const maxAttempts = 8
  const delayMs = 2000
  let attempt = 0
  while(true){
    attempt++
    let conn
    try{
      conn = await pool.getConnection()
      await conn.ping()
      try{ await conn.query("SET NAMES utf8mb4"); await conn.query("SET SESSION collation_connection = 'utf8mb4_unicode_ci'"); }catch(e){ console.error('failed to set utf8mb4 on connection', e) }
      conn.release()
      return
    }catch(err){
      if(conn) try{ conn.release() }catch(_){}
      console.error(`DB connection attempt ${attempt} failed`, err)
      if(attempt >= maxAttempts) throw err
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
}

module.exports = { pool, testConnection };