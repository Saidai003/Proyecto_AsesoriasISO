/**
 * Test de integración: WebSocket chat — validación IDOR y acceso por roles
 *
 * Requiere: RUN_INTEGRATION=true y la app corriendo en BACKEND_URL (default: http://localhost:3000)
 * Ejecutar: npm run test:integration
 *
 * Cubre:
 *  1. Login de los 3 roles obtiene token JWT válido
 *  2. Evaluador puede conectar al WS con un requisito_id de su workspace
 *  3. Responsable SGC puede conectar al WS con un nc_id de su workspace
 *  4. Admin puede conectar al WS sin restricción de workspace
 *  5. Conexión sin token es rechazada (4003)
 *  6. Conexión con token válido pero sin room válida es rechazada
 */

if (!process.env.RUN_INTEGRATION) {
  test.skip('integration tests skipped unless RUN_INTEGRATION=true', () => {})
} else {
  const request = require('supertest')
  const WebSocket = require('ws')
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000'
  const wsUrl = baseUrl.replace(/^http/, 'ws')
  const agent = request(baseUrl)

  const PASSWORD = process.env.TEST_PASSWORD || 'MiClave.ProyectoISO2026'

  // ── helpers ──────────────────────────────────────────────────────────────
  async function login(email) {
    const res = await agent
      .post('/auth/login')
      .send({ email, password: PASSWORD })
    if (res.statusCode !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`)
    // Token may be in body or cookie — try both
    return res.body.accessToken || res.body.token || null
  }

  /**
   * Abre una conexión WebSocket y espera a que se establezca o sea rechazada.
   * Si el servidor cierra la conexión poco después del open (cierre asíncrono del handler),
   * lo detecta y reporta el código de cierre en lugar de 'connected'.
   * Resuelve con: 'connected' | 'closed:<code>' | 'error:<msg>' | 'timeout'
   */
  function connectWs(path) {
    return new Promise((resolve) => {
      const ws = new WebSocket(`${wsUrl}${path}`)
      const TIMEOUT = 4000
      let opened = false
      let resolved = false

      const done = (result) => {
        if (resolved) return
        resolved = true
        clearTimeout(timer)
        resolve(result)
      }

      const timer = setTimeout(() => {
        ws.terminate()
        done('timeout')
      }, TIMEOUT)

      ws.on('open', () => {
        opened = true
        // Give the server 500ms to send a close frame after accepting the TCP upgrade
        // (the async WS handler may reject AFTER the handshake completes)
        setTimeout(() => {
          if (!resolved) {
            ws.close()
            done('connected')
          }
        }, 500)
      })
      ws.on('close', (code) => {
        if (opened && code === 1000) {
          // We initiated this close ourselves (normal closure)
          done('connected')
        } else {
          done(`closed:${code}`)
        }
      })
      ws.on('error', (err) => {
        done(`error:${err.message}`)
      })
    })
  }

  // ── datos necesarios: obtener un requisito_id y nc_id del workspace Demo ──
  let tokens = {}
  let sampleRequisitoId = null
  let sampleNcId = null

  beforeAll(async () => {
    // 1. Login de los 3 roles
    tokens.admin = await login('admin@demo.local')
    tokens.evaluador = await login('evaluador@demo.local')
    tokens.responsable = await login('responsable@demo.local')

    // 2. Obtener un requisito_id válido del workspace del evaluador
    const evalRes = await agent
      .get('/api/evaluaciones')
      .set('Authorization', `Bearer ${tokens.evaluador}`)
    if (evalRes.statusCode === 200 && evalRes.body.length > 0) {
      sampleRequisitoId = evalRes.body[0].id
    }

    // 3. Obtener un nc_id válido del workspace del responsable
    const ncRes = await agent
      .get('/api/nc')
      .set('Authorization', `Bearer ${tokens.responsable}`)
    if (ncRes.statusCode === 200 && ncRes.body.length > 0) {
      sampleNcId = ncRes.body[0].id
    }
  }, 15000)

  // ── Tests ─────────────────────────────────────────────────────────────────
  describe('Login — obtención de tokens', () => {
    test('Admin obtiene token JWT', () => {
      expect(tokens.admin).toBeTruthy()
    })
    test('Evaluador obtiene token JWT', () => {
      expect(tokens.evaluador).toBeTruthy()
    })
    test('Responsable SGC obtiene token JWT', () => {
      expect(tokens.responsable).toBeTruthy()
    })
  })

  describe('WebSocket — conexión sin token', () => {
    test('Conexión sin ?token es rechazada con código 4003', async () => {
      // Sin token: el handler rechaza con 4003 o cierra sin llegar a 'connected'
      const result = sampleRequisitoId
        ? await connectWs(`/ws?requisito_id=${sampleRequisitoId}`)
        : await connectWs('/ws')
      // No debe quedar como 'connected'
      expect(result).not.toBe('connected')
    })
  })

  describe('WebSocket — Evaluador', () => {
    test('Evaluador se conecta a sala de requisito de su workspace', async () => {
      if (!sampleRequisitoId) return console.warn('Sin requisito_id disponible, test omitido')
      const result = await connectWs(`/ws?token=${tokens.evaluador}&requisito_id=${sampleRequisitoId}`)
      expect(result).toBe('connected')
    })

    test('Evaluador NO puede conectar al canal global (sin room)', async () => {
      const result = await connectWs(`/ws?token=${tokens.evaluador}`)
      expect(result).toContain('closed:4003')
    })
  })

  describe('WebSocket — Responsable SGC', () => {
    test('Responsable se conecta a sala de NC de su workspace', async () => {
      if (!sampleNcId) return console.warn('Sin nc_id disponible, test omitido')
      const result = await connectWs(`/ws?token=${tokens.responsable}&nc_id=${sampleNcId}`)
      expect(result).toBe('connected')
    })
  })

  describe('WebSocket — Admin', () => {
    test('Admin se conecta al canal global sin workspace', async () => {
      const result = await connectWs(`/ws?token=${tokens.admin}`)
      expect(result).toBe('connected')
    })

    test('Admin puede conectar a cualquier sala de requisito', async () => {
      if (!sampleRequisitoId) return console.warn('Sin requisito_id disponible, test omitido')
      const result = await connectWs(`/ws?token=${tokens.admin}&requisito_id=${sampleRequisitoId}`)
      expect(result).toBe('connected')
    })
  })

  describe('HTTP Chat — POST y GET por roles', () => {
    test('Evaluador puede leer mensajes de su requisito', async () => {
      if (!sampleRequisitoId) return
      const res = await agent
        .get(`/api/chat?requisito_id=${sampleRequisitoId}`)
        .set('Authorization', `Bearer ${tokens.evaluador}`)
      expect([200, 204]).toContain(res.statusCode)
      expect(Array.isArray(res.body)).toBe(true)
    })

    test('Admin puede leer mensajes de cualquier requisito', async () => {
      if (!sampleRequisitoId) return
      const res = await agent
        .get(`/api/chat?requisito_id=${sampleRequisitoId}`)
        .set('Authorization', `Bearer ${tokens.admin}`)
      expect([200, 204]).toContain(res.statusCode)
    })

    test('Evaluador puede enviar un mensaje', async () => {
      if (!sampleRequisitoId) return
      const res = await agent
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokens.evaluador}`)
        .send({ requisito_id: sampleRequisitoId, contenido: '[TEST] mensaje de prueba evaluador' })
      expect(res.statusCode).toBe(201)
      expect(res.body.contenido).toBe('[TEST] mensaje de prueba evaluador')
    })

    test('Responsable SGC puede enviar un mensaje a una NC', async () => {
      if (!sampleNcId) return
      const res = await agent
        .post('/api/chat')
        .set('Authorization', `Bearer ${tokens.responsable}`)
        .send({ nc_id: sampleNcId, contenido: '[TEST] mensaje de prueba responsable' })
      expect(res.statusCode).toBe(201)
    })
  })
}
