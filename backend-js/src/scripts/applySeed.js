const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function run(){
  const seedPath = path.resolve(__dirname, '../../../seeds/seedISO_data_only.sql')
  if(!fs.existsSync(seedPath)){
    console.error('Seed file not found at', seedPath); process.exit(1)
  }
  const sql = fs.readFileSync(seedPath, 'utf8')

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'proyecto_user',
    password: process.env.DB_PASSWORD || 'change_me',
    database: process.env.DB_NAME || 'proyecto_iso',
    multipleStatements: true,
    charset: 'utf8mb4'
  })

  try{
    console.log('Executing seed SQL...')
    await connection.query(sql)
    console.log('Seed applied successfully')
  }catch(err){
    console.error('Error applying seed:', err)
    process.exit(2)
  }finally{
    await connection.end()
  }
}

run()
