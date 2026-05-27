#!/usr/bin/env node
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || './.env' })
const driveService = require('../src/services/driveService')

async function main(){
  const code = process.argv[2]
  if(!code){
    try{
      const url = driveService.generateAuthUrl()
      console.log('Open this URL in your browser and authorize the app:')
      console.log(url)
      console.log('\nThen run: node scripts/get_drive_token.js <CODE>')
      process.exit(0)
    }catch(err){
      console.error('Error generating auth URL:', err.message || err)
      process.exit(2)
    }
  }
  try{
    const tokens = await driveService.getTokenFromCode(code)
    console.log('Saved tokens to configured path. Tokens keys:', Object.keys(tokens))
    process.exit(0)
  }catch(err){
    console.error('Error exchanging code for token:', err.message || err)
    process.exit(3)
  }
}

main()
