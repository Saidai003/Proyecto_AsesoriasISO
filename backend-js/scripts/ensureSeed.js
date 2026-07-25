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
const SEED_FILES = ['seedISO_utf8.sql', 'seed_users_workspaces.sql']

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

/**
 * Repairs only ISO seed strings that were previously imported through a
 * latin1 MySQL client. That import replaced every UTF-8 byte outside latin1
 * with `?`, which cannot be repaired in the browser.
 *
 * The canonical values stay in seedISO_utf8.sql; this deliberately does not
 * duplicate or reformulate the seed data in application code.
 */
async function repairCorruptedIsoText(connection){
  const seedPath = path.join(SEEDS_DIR, 'seedISO_utf8.sql')
  if(!fs.existsSync(seedPath)) return

  const sql = fs.readFileSync(seedPath, 'utf8').replace(/^\uFEFF/, '')
  const clauseMatches = [...sql.matchAll(/VALUES\s*\(@ISO_ID,\s*(\d+),\s*'([^']+)'\);/g)]
  const requirementMatches = [...sql.matchAll(/\(@CLAUSULA(\d+)_ID,\s*(?:NULL|@\w+),\s*'([^']+)'\)/g)]

  for(const [, number, title] of clauseMatches){
    await connection.execute(
      `UPDATE CLAUSULAS SET titulo = ?
       WHERE numero_clausula = ? AND titulo LIKE '%?%'`,
      [title, Number(number)]
    )
  }

  for(const [, clauseNumber, description] of requirementMatches){
    const prefix = description.match(/^(\d+(?:\.\d+)*)\b/)?.[1]
    if(!prefix) continue
    await connection.execute(
      `UPDATE REQUISITOS_BASE rb
       INNER JOIN CLAUSULAS c ON c.id = rb.clausula_id
       SET rb.descripcion_normativa = ?
       WHERE c.numero_clausula = ?
         AND rb.descripcion_normativa LIKE '%?%'
         AND rb.descripcion_normativa REGEXP ?`,
      [description, Number(clauseNumber), `^${prefix.replace(/\./g, '\\.')}( |$)`]
    )
  }
}

async function run(){
  let connection
  try{
    connection = await createConnection()

    const alreadySeeded = await isAlreadySeeded(connection)
    if(!alreadySeeded){
      console.log('[ensureSeed] Primera configuración: aplicando seeds después del esquema...')
      for(const file of SEED_FILES){
        await applySeedFile(connection, file)
      }
      await repairCorruptedIsoText(connection)
      console.log('[ensureSeed] Seeds aplicados correctamente.')
      return
    }

    console.log('[ensureSeed] La base ya tiene datos ISO; aplicando/verificando seed de usuarios demo...')
    await applySeedFile(connection, 'seed_users_workspaces.sql')
    await repairCorruptedIsoText(connection)
    console.log('[ensureSeed] Seed de usuarios demo aplicado/verificado correctamente.')
  }catch(err){
    console.error('[ensureSeed] Error:', err.message || err)
    process.exit(1)
  }finally{
    if(connection) await connection.end()
  }
}

run()

