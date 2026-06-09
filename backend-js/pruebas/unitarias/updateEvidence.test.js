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
    const existing = { id: 1, usuario_carga_id: 5, evaluacion_requisito_id: 1 }
    pool.query.mockResolvedValueOnce([ [existing] ]) // workspace lookup

    const req = { params: { id: '1' }, body: { comentario_evidencia: 'x' }, user: { id: 9, role: 'Evaluador', workspace_id: 1 } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' })
  })

  test('Responsable SGC cannot update another users evidence', async () => {
    const existing = { id: 3, usuario_carga_id: 99, nombre_archivo: 'f.pdf', evaluacion_requisito_id: 1, ev_id: 1, comentario_evidencia: 'old' }
    pool.query.mockResolvedValueOnce([ [existing] ]) // workspace lookup

    const req = { params: { id: '3' }, body: { comentario_evidencia: 'x' }, user: { id: 5, role: 'Responsable SGC', workspace_id: 1 } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' })
  })

  test('Responsable SGC can update own evidence', async () => {
    const existing = { id: 4, usuario_carga_id: 5, nombre_archivo: 'f.pdf', evaluacion_requisito_id: 1, ev_id: 1, comentario_evidencia: 'old' }
    const updated = { ...existing, comentario_evidencia: 'mine' }
    pool.query
      .mockResolvedValueOnce([ [existing] ]) // workspace lookup
      .mockResolvedValueOnce([{}]) // UPDATE
      .mockResolvedValueOnce([{}]) // INSERT LOG
      .mockResolvedValueOnce([ [updated] ]) // final SELECT

    const req = { params: { id: '4' }, body: { comentario_evidencia: 'mine' }, user: { id: 5, role: 'Responsable SGC', workspace_id: 1 } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.json).toHaveBeenCalled()
    expect(res.json.mock.calls[0][0].evidence.comentario_evidencia).toBe('mine')
  })

  test('Admin can update estado_validacion_archivo', async () => {
    const existing = { id: 2, usuario_carga_id: 7, nombre_archivo: 'f.pdf' }
    const updated = { id: 2, usuario_carga_id: 7, estado_validacion_archivo: 'Aceptado', nombre_archivo: 'f.pdf' }

    // call order: workspace lookup, UPDATE, INSERT LOG, SELECT updated
    pool.query.mockResolvedValueOnce([ [existing] ]) // Admin without workspace uses direct id lookup
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
