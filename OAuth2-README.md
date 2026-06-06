
El token de Google Drive se guarda automáticamente siempre 
que el backend esté corriendo y accesible en `http://localhost:3000`.
Aquí el flujo completo y el código:

---

## Flujo OAuth2 en este proyecto

```
┌─────────────┐     1. GET /google-drive/auth      ┌─────────────┐
│  Navegador  │ ─────────────────────────────────► │   Backend   │
└─────────────┘                                    │ (Express)   │
       │                                           └──────┬──────┘
       │                                                  │
       │  2. Redirige a Google OAuth2                     │
       │  (genera URL con generateAuthUrl())              │
       ▼                                                  ▼
┌─────────────┐                                    ┌───────
│   Google    │                                    │      
│  Consent    │                                    │             
│   Screen    │                                    │             
└──────┬──────┘                                    │             
       │                                           │             
       │  3. Usuario da consentimiento             │            
       │                                           │             
       ▼                                           │             
┌─────────────┐                                    │             
│   Google    │  4. Redirect a                     │             
│  Redirect   │  http://localhost:3000/            │             
│   (con code)│  google-drive/callback?code=XYZ    │             
└──────┬──────┘                                    │             
       │                                           │             
       │  5. GET /google-drive/callback?code=XYZ   │             
       └─────────────────────────────────────────► │             
                                                   │             
                                                   ▼             
                                            ┌─────────────┐
                                            │ driveService│
                                            │ .getToken-  │
                                            │ FromCode()  │
                                            └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │ Guarda en   │
                                            │ .credentials/│
                                            │ drive_token.json│
                                            └─────────────┘
```

---

## Código relevante

### 1. Endpoint `/auth` (inicia el flujo) - `backend-js/src/routes/drive.js`

```javascript
router.get('/auth', (req, res) => {
  try{
    const url = driveService.generateAuthUrl()  // Genera URL de Google
    return res.redirect(url)                    // Redirige al navegador
  }catch(err){
    return res.status(500).send('drive_auth_unavailable')
  }
})
```

### 2. `generateAuthUrl()` - `backend-js/src/services/driveService.js`

```javascript
function generateAuthUrl(){
  const client = createOAuth2Client()  // Crea OAuth2Client con client_id, secret, redirect_uri
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  return client.generateAuthUrl({ 
    access_type: 'offline',    // Importante: obtiene refresh_token
    scope: SCOPES,             // ['https://www.googleapis.com/auth/drive.file']
    prompt: 'consent'          // Fuerza pantalla de consentimiento siempre
  })
}
```

### 3. Endpoint `/callback` (recibe el code) - `backend-js/src/routes/drive.js`

```javascript
router.get('/callback', async (req, res) => {
  const code = req.query && req.query.code
  if(!code) return res.status(400).send('missing_code')
  try{
    await driveService.getTokenFromCode(code)  // ← AQUÍ se guarda el token
    return res.send('Google Drive authorization successful. You can close this window.')
  }catch(err){
    console.error('callback token exchange failed', err)
    return res.status(500).send('token_exchange_failed')
  }
})
```

### 4. `getTokenFromCode()` - `backend-js/src/services/driveService.js` **← LA CLAVE**

```javascript
async function getTokenFromCode(code){
  const client = createOAuth2Client()
  if(!client) throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET')
  
  const { tokens } = await client.getToken(code)  // Intercambia code por tokens (access + refresh)
  
  await saveToken(tokens)  // ← GUARDA AUTOMÁTICAMENTE EN .credentials/drive_token.json
  
  client.setCredentials(tokens)
  return tokens
}
```

### 5. `saveToken()` - `backend-js/src/services/driveService.js`

```javascript
async function saveToken(tokens){
  try{
    const dir = path.dirname(TOKEN_PATH)  // backend-js/.credentials/
    await fs.mkdir(dir, { recursive: true })  // Crea directorio si no existe
  }catch(_){ }
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8')
  // TOKEN_PATH = backend-js/.credentials/drive_token.json
}
```

---

## Requisitos para que funcione automáticamente

| Requisito | Por qué |
|-----------|---------|
| Backend corriendo en `localhost:3000` | Google redirige ahí con el `code` |
| `GOOGLE_REDIRECT_URI=http://localhost:3000/google-drive/callback` en `.env` | Debe coincidir **exactamente** con lo registrado en Google Cloud Console |
| `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env` | Para crear el OAuth2Client |
| Directorio `.credentials/` escribible | `saveToken()` hace `mkdir` y `writeFile` |
| **Sin `:ro` (read-only) en docker-compose** | Si el volumen es read-only, falla el `writeFile` |

---

## Verificación posterior

```bash
# Verificar que se guardó
curl http://localhost:3000/google-drive/status
# {"authorized":true}

# Ver el archivo
cat backend-js/.credentials/drive_token.json
# { "access_token": "ya29...", "refresh_token": "1//...", "scope": "...", "token_type": "Bearer", "expiry_date": 1234567890 }
```

---

## Resumen: ¿Por qué ocurre automáticamente?

1. Tú abres `/google-drive/auth` → backend genera URL de Google y **redirige**
2. Das consentimiento en Google → Google **redirige de vuelta** a tu `/callback?code=XYZ`
3. Tu backend recibe el `code` en `/callback` → llama a `getTokenFromCode(code)`
4. `getTokenFromCode` usa `google-auth-library` para intercambiar `code` por tokens
5. **Inmediatamente después** llama a `saveToken(tokens)` que escribe `drive_token.json`
6. Listo: el token queda guardado y listo para usar en subidas posteriores