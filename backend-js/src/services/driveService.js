const { google } = require('googleapis')
const fs = require('fs').promises
const path = require('path')
const stream = require('stream')

// Token path can be overridden with env var to avoid committing tokens into repo.
// Set GOOGLE_DRIVE_TOKEN_PATH to an absolute or workspace-relative path (e.g. ./.env.drive_token)
const TOKEN_DIR = path.join(__dirname, '..', '..', '.credentials')
const TOKEN_PATH = process.env.GOOGLE_DRIVE_TOKEN_PATH ? path.resolve(process.env.GOOGLE_DRIVE_TOKEN_PATH) : path.join(TOKEN_DIR, 'drive_token.json')

const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// Carpeta intermedia bajo GOOGLE_DRIVE_FOLDER_ID: Development | Production
let cachedDriveRootFolderId = null

function getDriveEnvironmentFolderName(){
  if(process.env.GOOGLE_DRIVE_ENV_FOLDER) return process.env.GOOGLE_DRIVE_ENV_FOLDER
  return process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
}

/**
 * Devuelve la carpeta raíz de evidencias para el entorno actual.
 * Estructura en Drive: GOOGLE_DRIVE_FOLDER_ID → Development|Production → workspace → requisito
 */
async function getDriveRootFolderId(){
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if(!parentId) return null

  if(cachedDriveRootFolderId) return cachedDriveRootFolderId

  const envFolderName = getDriveEnvironmentFolderName()
  cachedDriveRootFolderId = await ensureFolder(parentId, envFolderName)
  console.log(`driveService: usando carpeta de entorno "${envFolderName}" (${cachedDriveRootFolderId})`)
  return cachedDriveRootFolderId
}

function createOAuth2Client(){
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
  if(!clientId || !clientSecret) return null
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

async function loadSavedToken(oAuth2Client){
  // 1. PRIORIDAD NUBE: Intentar cargar desde la variable de entorno
  if (process.env.GOOGLE_DRIVE_TOKEN) {
    try {
      const tokens = JSON.parse(process.env.GOOGLE_DRIVE_TOKEN)
      oAuth2Client.setCredentials(tokens)
      console.log('driveService: loaded token from GOOGLE_DRIVE_TOKEN environment variable')
      return true
    } catch (error) {
      console.error('driveService: failed to parse GOOGLE_DRIVE_TOKEN environment variable', error)
    }
  }

  // 2. FALLBACK LOCAL: Intentar cargar desde el archivo
  try{
    const content = await fs.readFile(TOKEN_PATH, 'utf8')
    oAuth2Client.setCredentials(JSON.parse(content))
    console.log('driveService: loaded saved token from', TOKEN_PATH)
    return true
  }catch(_){
    console.log('driveService: no saved token at', TOKEN_PATH, 'and no environment variable found')
    return false
  }
}

async function saveToken(tokens){
  try{
    // Ensure directory exists when saving to a directory path
    const dir = path.dirname(TOKEN_PATH)
    await fs.mkdir(dir, { recursive: true })
  }catch(_){ }
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8')
}

function generateAuthUrl(){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  return client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' })
}

async function getTokenFromCode(code){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const { tokens } = await client.getToken(code)
  await saveToken(tokens)
  client.setCredentials(tokens)
  return tokens
}

async function hasSavedToken(){
  // 1. PRIORIDAD NUBE
  if (process.env.GOOGLE_DRIVE_TOKEN) return true;

  // 2. FALLBACK LOCAL
  try{
    await fs.access(TOKEN_PATH)
    return true
  }catch(_){
    return false
  }
}

async function uploadBuffer({ buffer, mimeType, name, parents }){
  let parentIds = undefined
  if(parents){
    parentIds = Array.isArray(parents) ? parents : [parents]
  }else{
    const rootId = await getDriveRootFolderId()
    if(rootId) parentIds = [rootId]
  }

  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })

  const passthrough = new stream.PassThrough()
  passthrough.end(buffer)

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType,
      parents: parentIds || undefined
    },
    media: {
      mimeType,
      body: passthrough
    },
    fields: 'id'
  })

  const fileId = res.data.id

  const meta = await drive.files.get({ fileId, fields: 'id, webViewLink, webContentLink' })
  return { id: fileId, webViewLink: meta.data.webViewLink, webContentLink: meta.data.webContentLink }
}

async function ensureFolder(parentId, name){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })
  const qParts = [`name = '${name.replace(/'/g, "\\'")}'`, "mimeType = 'application/vnd.google-apps.folder'", 'trashed = false']
  if(parentId) qParts.push(`'${parentId}' in parents`)
  const q = qParts.join(' and ')
  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive', pageSize: 10 })
  if(res.data.files && res.data.files.length>0) return res.data.files[0].id
  const created = await drive.files.create({ requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : undefined }, fields: 'id' })
  return created.data.id
}

async function findFileInFolder(parentId, name){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })
  const qParts = [`name = '${name.replace(/'/g, "\\'")}'`, 'trashed = false']
  if(parentId) qParts.push(`'${parentId}' in parents`)
  const q = qParts.join(' and ')
  const res = await drive.files.list({ q, fields: 'files(id, name, mimeType)', spaces: 'drive', pageSize: 10 })
  return (res.data.files && res.data.files[0]) || null
}

async function deleteFile(fileId){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })
  return drive.files.delete({ fileId })
}

async function updateFile(fileId, { buffer, mimeType }){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })
  const passthrough = new stream.PassThrough(); passthrough.end(buffer)
  // Keep the new Drive revision so the previous version remains available as history.
  const updated = await drive.files.update({
    fileId,
    media: { mimeType, body: passthrough },
    keepRevisionForever: true
  })
  const revisions = await drive.revisions.list({
    fileId,
    fields: 'revisions(id, keepForever, modifiedTime)'
});

console.log(JSON.stringify(revisions.data, null, 2));

  return updated
}

async function getFileMeta(fileId, fields='id, webViewLink, webContentLink, name'){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })
  const res = await drive.files.get({ fileId, fields })
  return res.data
}

// Download file as stream and return metadata
async function downloadFile(fileId){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  const ok = await loadSavedToken(client)
  if(!ok) throw new Error('no_saved_token')
  const drive = google.drive({ version: 'v3', auth: client })
  const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType' })
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' })
  return { stream: res.data, mimeType: meta.data.mimeType, name: meta.data.name }
}

module.exports = {
  generateAuthUrl,
  getTokenFromCode,
  uploadBuffer,
  hasSavedToken,
  getDriveEnvironmentFolderName,
  getDriveRootFolderId,
  ensureFolder,
  findFileInFolder,
  deleteFile,
  updateFile,
  getFileMeta,
  downloadFile
}