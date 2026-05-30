// Mock DB and Drive service used by the controller
jest.mock('../../src/db', () => ({ pool: { query: jest.fn() } }))
jest.mock('../../src/services/driveService', () => ({
  uploadBuffer: jest.fn(),
  ensureFolder: jest.fn(),
  findFileInFolder: jest.fn(),
  updateFile: jest.fn(),
  deleteFile: jest.fn(),
  getFileMeta: jest.fn(),
  downloadFile: jest.fn(),
  generateAuthUrl: jest.fn()
}))

const { pool } = require('../../src/db')
const controller = require('../../src/controllers/evidenceController')

describe('updateEvidence permissions and basic flow', () => {
  beforeEach(()=>{
    jest.clearAllMocks()
  })

  test('Evaluator cannot update forbidden fields', async () => {
    const existing = { id: 1, usuario_carga_id: 5 }
    pool.query.mockResolvedValueOnce([ [existing] ]) // initial SELECT

    const req = { params: { id: '1' }, body: { comentario_evidencia: 'x' }, user: { id: 9, role: 'Evaluador' } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' })
  })

  test('Admin can update estado_validacion_archivo', async () => {
    const existing = { id: 2, usuario_carga_id: 7, nombre_archivo: 'f.pdf' }
    const updated = { id: 2, usuario_carga_id: 7, estado_validacion_archivo: 'Aceptado', nombre_archivo: 'f.pdf' }

    // call order: SELECT existing, UPDATE, INSERT LOG, SELECT updated
    pool.query.mockResolvedValueOnce([ [existing] ])
    pool.query.mockResolvedValueOnce([{}]) // UPDATE
    pool.query.mockResolvedValueOnce([{}]) // INSERT LOG
    pool.query.mockResolvedValueOnce([ [updated] ]) // final SELECT

    const req = { params: { id: '2' }, body: { estado_validacion_archivo: 'Aceptado' }, user: { id: 1, role: 'Admin' } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.json).toHaveBeenCalled()
    const arg = res.json.mock.calls[0][0]
    expect(arg).toHaveProperty('evidence')
    expect(arg.evidence.id).toBe(2)
    expect(arg.evidence.estado_validacion_archivo).toBe('Aceptado')
  })
})
