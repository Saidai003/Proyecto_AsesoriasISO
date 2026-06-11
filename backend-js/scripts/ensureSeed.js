/**
 * Aplica los seeds SQL solo si la base está vacía (sin datos ISO).
 * Idempotente: si ya hay filas en ISOS, no hace nada.
 * Se ejecuta al arrancar el backend tras confirmar que MySQL está listo.
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

// Ahora busca la carpeta seeds dentro del propio backend-js
const SEEDS_DIR = process.env.SEEDS_DIR || path.resolve(__dirname, '../seeds')
const SEED_FILES = ['init.sql', 'seedISO_utf8.sql', 'seed_users_workspaces.sql']

async function createConnection(){
  return mysql.createConnection({
    host: process.env.DB_HOST || 'mysql',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'proyecto_user',
    password: process.env.DB_PASSWORD || 'change_me',
    database: process.env.DB_NAME || 'proyecto_iso',
    multipleStatements: true,
    charset: 'utf8mb4'
  })
}

async function isAlreadySeeded(connection){
  try{
    const [rows] = await connection.query('SELECT COUNT(*) AS c FROM ISOS')
    return Number(rows[0].c) > 0
  }catch(err){
    // Tabla aún no existe: init.sql no terminó o la BD no está lista
    if(err && err.code === 'ER_NO_SUCH_TABLE') return false
    throw err
  }
}

async function applySeedFile(connection, filename){
  const filePath = path.join(SEEDS_DIR, filename)
  if(!fs.existsSync(filePath)){
    console.warn(`[ensureSeed] Archivo no encontrado, se omite: ${filePath}`)
    return
  }
  
  // 1. Leemos el archivo
  let sql = fs.readFileSync(filePath, 'utf8')
  
  // 2. MAGIA: Eliminamos el BOM invisible si es que existe
  sql = sql.replace(/^\uFEFF/, '') 
  
  console.log(`[ensureSeed] Ejecutando ${filename}...`)
  await connection.query(sql)
}

async function run(){
  let connection
  try{
    connection = await createConnection()

    if(await isAlreadySeeded(connection)){
      console.log('[ensureSeed] La base ya tiene datos ISO; no se aplican seeds.')
      return
    }

    console.log('[ensureSeed] Primera configuración: aplicando seeds después del esquema...')
    for(const file of SEED_FILES){
      await applySeedFile(connection, file)
    }
    console.log('[ensureSeed] Seeds aplicados correctamente.')
  }catch(err){
    console.error('[ensureSeed] Error:', err.message || err)
    process.exit(1)
  }finally{
    if(connection) await connection.end()
  }
}

run()
