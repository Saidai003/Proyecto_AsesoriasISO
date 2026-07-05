jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn(), query: jest.fn() }
}));

const { pool } = require('../../src/db');
const { verifyWorkspaceAccess } = require('../../src/lib/workspaceAuth');
const {
  getOrCreateEvaluacion,
  updateEvaluacionEstado
} = require('../../src/controllers/evaluationsController');
const {
  createNC,
  deleteNC,
  listByEvaluacion,
  updateNC,
  listActions,
  getNC,
  getNCHistory,
  getNCHistoryByEvaluacion
} = require('../../src/controllers/ncController');
const {
  updateAction,
  deleteAction,
  getActionHistory,
  getAccionesByEvaluacion,
  createAction
} = require('../../src/controllers/accionesController');
const {
  listByRequisito,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  downloadEvidence,
  getEvidenceHistory,
  getEvidenceInWorkspace
} = require('../../src/controllers/evidenceController');
const { getMessages, postMessage } = require('../../src/controllers/chatController');
const {
  getAdminDashboard,
  getEvaluatorDashboard,
  getResponsibleDashboard,
  getOperativeDashboard
} = require('../../src/controllers/dashboardController');
const { listNotifications, markRead, clearForRequisito } = require('../../src/controllers/notificationsController');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('Multi-tenancy isolation', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  // -----------------------------------------------------------------------
  // verifyWorkspaceAccess utility
  // -----------------------------------------------------------------------
  describe('verifyWorkspaceAccess (lib/workspaceAuth)', () => {
    test('returns false when resourceId is missing', async () => {
      expect(await verifyWorkspaceAccess(null, 'nc', 1)).toBe(false);
      expect(await verifyWorkspaceAccess(0, 'nc', 1)).toBe(false);
    });

    test('returns false when workspaceId is missing', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      expect(await verifyWorkspaceAccess(1, 'nc', null)).toBe(false);
      expect(await verifyWorkspaceAccess(1, 'nc', undefined)).toBe(false);
    });

    test('returns false for unknown resourceType', async () => {
      expect(await verifyWorkspaceAccess(1, 'unknown', 1)).toBe(false);
    });

    test('returns true when evaluacion belongs to workspace', async () => {
      pool.execute.mockResolvedValueOnce([[{ id: 5 }]]);
      const result = await verifyWorkspaceAccess(5, 'evaluacion', 1);
      expect(result).toBe(true);
      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id FROM EVALUACION_REQUISITO WHERE id = ? AND workspace_id = ?',
        [5, 1]
      );
    });

    test('returns false when evaluacion belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const result = await verifyWorkspaceAccess(5, 'evaluacion', 1);
      expect(result).toBe(false);
    });

    test('returns true when NC belongs to workspace via evaluacion', async () => {
      pool.execute.mockResolvedValueOnce([[{ id: 3 }]]);
      const result = await verifyWorkspaceAccess(3, 'nc', 1);
      expect(result).toBe(true);
      expect(pool.execute).toHaveBeenCalledTimes(1);
    });

    test('returns false when NC belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const result = await verifyWorkspaceAccess(3, 'nc', 1);
      expect(result).toBe(false);
    });

    test('returns true when accion belongs to workspace via NC -> evaluacion', async () => {
      pool.execute.mockResolvedValueOnce([[{ id: 7 }]]);
      const result = await verifyWorkspaceAccess(7, 'accion', 1);
      expect(result).toBe(true);
    });

    test('returns false when accion belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const result = await verifyWorkspaceAccess(7, 'accion', 1);
      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Evaluaciones: workspace isolation
  // -----------------------------------------------------------------------
  describe('evaluationsController multi-tenancy', () => {
    test('getOrCreateEvaluacion scopes query to current workspace', async () => {
      pool.execute
        .mockResolvedValueOnce([[{ id: 1, estado_cumplimiento: 'NA' }]]);
      const req = { params: { id: '5' }, user: { id: 1, workspace_id: 2 } };
      const res = mockRes();
      await getOrCreateEvaluacion(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id, estado_cumplimiento FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?',
        ['5', 2]
      );
      expect(res.json).toHaveBeenCalledWith({ id: 1, estado_cumplimiento: 'NA' });
    });

    test('getOrCreateEvaluacion creates evaluacion for current workspace only', async () => {
      pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 99 }]);
      const req = { params: { id: '5' }, user: { id: 1, workspace_id: 2 } };
      const res = mockRes();
      await getOrCreateEvaluacion(req, res);
      expect(pool.execute).toHaveBeenNthCalledWith(2,
        'INSERT INTO EVALUACION_REQUISITO (requisito_base_id, workspace_id, estado_cumplimiento, fecha_ultima_edicion) VALUES (?, ?, ?, NOW())',
        ['5', 2, 'NA']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('updateEvaluacionEstado returns 404 when evaluacion belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '10' },
        body: { estado_cumplimiento: 'Cumple' },
        user: { id: 1, workspace_id: 1 }
      };
      const res = mockRes();
      await updateEvaluacionEstado(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('updateEvaluacionEstado succeeds when evaluacion belongs to user workspace', async () => {
      pool.execute
        .mockResolvedValueOnce([[{ id: 10 }]])
        .mockResolvedValueOnce();
      pool.query = jest.fn().mockResolvedValueOnce();
      const req = {
        params: { id: '10' },
        body: { estado_cumplimiento: 'Cumple' },
        user: { id: 1, workspace_id: 1 }
      };
      const res = mockRes();
      await updateEvaluacionEstado(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        expect.arrayContaining(['Cumple', 1, 10])
      );
    });
  });

  // -----------------------------------------------------------------------
  // NCs: workspace isolation
  // -----------------------------------------------------------------------
  describe('ncController multi-tenancy', () => {
    test('createNC resolves evaluacion for current workspace only', async () => {
      pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 50 }])
        .mockResolvedValueOnce();
      const req = {
        user: { id: 1, workspace_id: 1 },
        body: { requisito_base_id: 10, titulo: 'NC Test' }
      };
      const res = mockRes();
      await createNC(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?',
        [10, 1]
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('getNC returns 404 when NC belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '3' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getNC(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('updateNC returns 404 when NC belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '3' },
        body: { estado_flujo: 'Cerrada' },
        user: { workspace_id: 1, role: 'Evaluador' }
      };
      const res = mockRes();
      await updateNC(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deleteNC returns 404 when NC belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '3' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await deleteNC(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('listByEvaluacion returns 404 when eval belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '5' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await listByEvaluacion(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('listActions returns 404 when NC belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '3' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await listActions(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getNCHistory filters by workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '3' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getNCHistory(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE h.nc_id = ?'),
        [3, 3, 1]
      );
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('getNCHistoryByEvaluacion filters by workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '5' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getNCHistoryByEvaluacion(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE er.id = ? AND er.workspace_id = ?'),
        [5, 1]
      );
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  // -----------------------------------------------------------------------
  // Acciones correctivas: workspace isolation
  // -----------------------------------------------------------------------
  describe('accionesController multi-tenancy', () => {
    test('updateAction returns 404 when action belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '20' },
        body: { estado_accion: 'En_Progreso' },
        user: { id: 2, workspace_id: 1 }
      };
      const res = mockRes();
      await updateAction(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('deleteAction returns 404 when action belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '20' },
        user: { id: 2, workspace_id: 1 }
      };
      const res = mockRes();
      await deleteAction(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getActionHistory filters by workspace_id', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        user: { workspace_id: 1 },
        query: {}
      };
      const res = mockRes();
      await getActionHistory(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE er.workspace_id = ?'),
        expect.arrayContaining([1])
      );
    });

    test('getAccionesByEvaluacion returns 403 when eval belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '5' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getAccionesByEvaluacion(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('createAction returns 404 when NC belongs to another workspace', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '3' },
        body: { accion: 'Test action' },
        user: { id: 2, workspace_id: 1 }
      };
      const res = mockRes();
      await createAction(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // -----------------------------------------------------------------------
  // Evidencias: workspace isolation
  // -----------------------------------------------------------------------
  describe('evidenceController multi-tenancy', () => {
    test('listByRequisito scopes to current workspace via evaluacion_requisito', async () => {
      pool.query
        .mockResolvedValueOnce([[{ id: 10 }]])
        .mockResolvedValueOnce([[{ id: 1, nombre_archivo: 'ev.pdf' }]]);
      const req = {
        params: { id: '5' },
        user: { workspace_id: 1, role: 'Evaluador' }
      };
      const res = mockRes();
      await listByRequisito(req, res);
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id FROM EVALUACION_REQUISITO WHERE requisito_base_id = ? AND workspace_id = ?',
        [5, 1]
      );
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT * FROM EVIDENCIAS WHERE evaluacion_requisito_id = ? ORDER BY fecha_carga DESC',
        [10]
      );
    });

    test('createEvidence returns 403 when evaluacion belongs to another workspace', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const req = {
        body: { evaluacion_requisito_id: 10, nombre_archivo: 'test.pdf' },
        user: { workspace_id: 1, role: 'Evaluador', id: 2 }
      };
      const res = mockRes();
      await createEvidence(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('getEvidenceInWorkspace returns 404 for evidence of another workspace', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const req = { user: { workspace_id: 1 } };
      const result = await getEvidenceInWorkspace(999, req);
      expect(result).toEqual({ error: 'not_found', status: 404 });
    });

    test('deleteEvidence returns 404 for evidence of another workspace', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '999' },
        user: { workspace_id: 1, role: 'Admin', id: 1 }
      };
      const res = mockRes();
      await deleteEvidence(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('downloadEvidence returns 404 for evidence of another workspace', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '999' },
        user: { workspace_id: 1, role: 'Admin', id: 1 }
      };
      const res = mockRes();
      await downloadEvidence(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('getEvidenceHistory returns 404 for evidence of another workspace', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const req = {
        params: { id: '999' },
        user: { workspace_id: 1, role: 'Admin', id: 1 }
      };
      const res = mockRes();
      await getEvidenceHistory(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // -----------------------------------------------------------------------
  // Chat: workspace isolation for NC-linked messages
  // -----------------------------------------------------------------------
  describe('chatController multi-tenancy', () => {
    test('getMessages verifies workspace access when querying NC chat', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        query: { nc_id: '3' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getMessages(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    });

    test('getMessages verifies workspace access when querying requisito chat', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        query: { requisito_id: '5' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getMessages(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    });

    test('getMessages returns messages when requisito belongs to user workspace', async () => {
      pool.execute
        .mockResolvedValueOnce([[{ id: 5 }]])
        .mockResolvedValueOnce([[{ id: 1, contenido: 'hola' }]]);
      const req = {
        query: { requisito_id: '5' },
        user: { workspace_id: 1 }
      };
      const res = mockRes();
      await getMessages(req, res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1, contenido: 'hola' }]);
    });

    test('postMessage verifies workspace access when posting to NC chat', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        headers: { authorization: 'Bearer test-token' },
        body: { nc_id: 3, contenido: 'hola' },
        user: { workspace_id: 1, id: 2 }
      };
      const res = mockRes();
      await postMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    });

    test('postMessage verifies workspace access when posting to requisito chat', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = {
        headers: { authorization: 'Bearer test-token' },
        body: { requisito_id: 5, contenido: 'hola' },
        user: { workspace_id: 1, id: 2 }
      };
      const res = mockRes();
      await postMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'forbidden' });
    });

    test('postMessage succeeds when requisito belongs to user workspace', async () => {
      pool.execute
        .mockResolvedValueOnce([[{ id: 5 }]])
        .mockResolvedValueOnce([[{ nombre: 'Admin', role_id: 1 }]])
        .mockResolvedValueOnce([[{ nombre: 'Admin' }]])
        .mockResolvedValueOnce([{ insertId: 99 }])
        .mockResolvedValueOnce([[{ id: 99, contenido: 'hola', metadata: null }]]);
      const req = {
        headers: { authorization: 'Bearer test-token' },
        body: { requisito_id: 5, contenido: 'hola' },
        user: { workspace_id: 1, id: 2 }
      };
      const res = mockRes();
      await postMessage(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 99, contenido: 'hola' }));
    });
  });

  // -----------------------------------------------------------------------
  // Notifications: user-scoped (no cross-user leakage)
  // -----------------------------------------------------------------------
  describe('notificationsController multi-tenancy', () => {
    test('listNotifications only returns notifications for current user', async () => {
      pool.execute.mockResolvedValueOnce([[{ id: 1, usuario_id: 7 }]]);
      const req = { user: { id: 7 } };
      const res = mockRes();
      await listNotifications(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT id, tipo, mensaje, link, read_flag, created_at FROM NOTIFICACIONES WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 50',
        [7]
      );
    });

    test('markRead only marks current user notification', async () => {
      pool.execute.mockResolvedValueOnce([[]]);
      const req = { params: { id: '5' }, user: { id: 7 } };
      const res = mockRes();
      await markRead(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('clearForRequisito only deletes current user notifications', async () => {
      pool.execute.mockResolvedValueOnce();
      const req = {
        params: { id: '5' },
        user: { id: 7 }
      };
      const res = mockRes();
      await clearForRequisito(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE n.usuario_id = ?'),
        expect.arrayContaining([7])
      );
    });
  });

  // -----------------------------------------------------------------------
  // Dashboards: all functions scope to workspace
  // -----------------------------------------------------------------------
  describe('dashboardController multi-tenancy', () => {
    test('getEvaluatorDashboard queries only user workspace', async () => {
      const mockRows = [{ id_visual: 'NC-2025-001', estado: 'Verificacion' }];
      pool.execute
        .mockResolvedValueOnce([[{ workspace_id: 1, role_id: 2 }]])
        .mockResolvedValueOnce([mockRows])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ promedio_dias: null }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const req = {
        headers: { authorization: 'Bearer valid' },
        query: {}
      };
      const res = mockRes();
      await getEvaluatorDashboard(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE er.workspace_id = ?'),
        expect.arrayContaining([1])
      );
    });

    test('getResponsibleDashboard queries only user workspace', async () => {
      pool.execute
        .mockResolvedValueOnce([[{ workspace_id: 1, role_id: 2 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const req = {
        headers: { authorization: 'Bearer valid' },
        query: {}
      };
      const res = mockRes();
      await getResponsibleDashboard(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE er.workspace_id = ?'),
        expect.arrayContaining([1])
      );
    });

    test('getOperativeDashboard queries only user workspace', async () => {
      pool.execute
        .mockResolvedValueOnce([[{ workspace_id: 1, role_id: 2 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      const req = {
        headers: { authorization: 'Bearer valid' },
        query: {}
      };
      const res = mockRes();
      await getOperativeDashboard(req, res);
      expect(pool.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE er.workspace_id = ?'),
        expect.arrayContaining([1])
      );
    });
  });
});
