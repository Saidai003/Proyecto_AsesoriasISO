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
  generateAuthUrl: jest.fn(),
  getDriveRootFolderId: jest.fn().mockResolvedValue('root')
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

  test('Admin cannot update estado_validacion_archivo', async () => {
    const existing = { id: 2, usuario_carga_id: 7, nombre_archivo: 'f.pdf' }
    pool.query.mockResolvedValueOnce([ [existing] ])

    const req = { params: { id: '2' }, body: { estado_validacion_archivo: 'Aceptado' }, user: { id: 1, role: 'Admin' } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' })
  })

  test('Evaluador can update estado_validacion_archivo', async () => {
    const existing = { id: 2, usuario_carga_id: 7, nombre_archivo: 'f.pdf', evaluacion_requisito_id: 1, ev_id: 1, estado_validacion_archivo: 'Pendiente' }
    const updated = { ...existing, estado_validacion_archivo: 'Aceptado' }
    pool.query
      .mockResolvedValueOnce([ [existing] ])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([ [updated] ])

    const req = { params: { id: '2' }, body: { estado_validacion_archivo: 'Aceptado' }, user: { id: 9, role: 'Evaluador', workspace_id: 1 } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(res.json).toHaveBeenCalledWith({ evidence: updated, forceDeleteResult: null })
  })
  test('Replacing a file preserves the previous Drive file and updates the evidence reference', async () => {
    const existing = { id: 5, usuario_carga_id: 1, evaluacion_requisito_id: 1, ev_id: 1, nombre_archivo: 'old.pdf', drive_file_id: 'old-drive-id', url_archivo: 'drive://old-drive-id', comentario_evidencia: 'old' }
    const updated = { ...existing, nombre_archivo: 'new.pdf', drive_file_id: 'new-drive-id', url_archivo: 'drive://new-drive-id' }

    const driveService = require('../../src/services/driveService')
    driveService.uploadBuffer.mockResolvedValue({ id: 'new-drive-id' })

    pool.query
      .mockResolvedValueOnce([ [existing] ]) // workspace lookup
      .mockResolvedValueOnce([ [{ nombre_cliente: 'workspace-1' }] ]) // workspace metadata lookup
      .mockResolvedValueOnce([{}]) // UPDATE
      .mockResolvedValueOnce([{}]) // INSERT LOG
      .mockResolvedValueOnce([ [updated] ]) // final SELECT

    const req = {
      params: { id: '5' },
      body: {
        fileData: 'data:application/pdf;base64,AA==',
        nombre_archivo: 'new.pdf',
        force_delete_before_upload: true
      },
      user: { id: 1, role: 'Responsable SGC', workspace_id: 1 }
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }

    await controller.updateEvidence(req, res)

    expect(driveService.deleteFile).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalled()
    const arg = res.json.mock.calls[0][0]
    expect(arg.evidence.drive_file_id).toBe('new-drive-id')
    expect(arg.evidence.url_archivo).toBe('drive://new-drive-id')
  })
})
