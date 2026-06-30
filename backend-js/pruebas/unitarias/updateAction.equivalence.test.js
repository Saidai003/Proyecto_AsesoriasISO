/**
 * Test de equivalencia para updateAction
 * Objetivo: verificar que la versión refactorizada produce los mismos resultados
 * que la versión original bajo los mismos inputs.
 */

jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn() }
}));

const { pool } = require('../../src/db');
const { updateAction } = require('../../src/controllers/accionesController');

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function mockReq(overrides = {}) {
  return {
    params: { id: '10' },
    body: {},
    user: { id: 1, workspace_id: 5, role: 'Responsable SGC' },
    ...overrides
  };
}

// Simula la acción actual en BD
const BASE_ACTION = {
  id: 10,
  auditoria_nc_id: 3,
  accion: 'Revisar proceso',
  contenido_comentario: 'Comentario original',
  acciones_futuras_propuestas: 'Propuesta original',
  requiere_nueva_nc: 0,
  estado_accion: 'Pendiente',
  fecha_accion: '2026-06-01'
};

describe('updateAction - equivalencia de comportamiento', () => {
  beforeEach(() => jest.clearAllMocks());

  // Helper: configura mocks para un flujo exitoso
  function setupMocks(actionInDb, expectedUpdatedRow) {
    const calls = [];
    pool.execute.mockImplementation(async (sql, params) => {
      calls.push({ sql, params });
      // 1. SELECT IDOR check
      if (sql.includes('SELECT ac.*') && sql.includes('JOIN AUDITORIA_NC')) return [[actionInDb]];
      // INSERT hist
      if (sql.includes('INSERT INTO ACCIONES_CORRECTIVAS_HIST')) return [{ insertId: 99 }];
      // SELECT responsables
      if (sql.includes('SELECT usuario_id FROM AUDITORIA_NC_RESPONSABLES')) return [[]];
      // INSERT NOTIFICACIONES
      if (sql.includes('INSERT INTO NOTIFICACIONES')) return [{ insertId: 1 }];
      // UPDATE
      if (sql.includes('UPDATE ACCIONES_CORRECTIVAS SET')) return [{ affectedRows: 1 }];
      // Final SELECT
      if (sql.includes('SELECT * FROM ACCIONES_CORRECTIVAS WHERE id')) return [[expectedUpdatedRow]];
      return [[]];
    });
    return calls;
  }

  // --- TEST 1: ID inválido retorna 400 ---
  test('retorna 400 si id es 0 o no numérico', async () => {
    const req = mockReq({ params: { id: '0' } });
    const res = mockRes();
    await updateAction(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'id required' });
  });

  // --- TEST 2: IDOR - acción no pertenece al workspace ---
  test('retorna 404 si la acción no pertenece al workspace', async () => {
    pool.execute.mockResolvedValueOnce([[]]); // IDOR query devuelve vacío
    const req = mockReq({ body: { accion: 'Cambio' } });
    const res = mockRes();
    await updateAction(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'not_found' });
  });

  // --- TEST 3: Editar campo de texto (accion) ---
  test('editar campo accion genera UPDATE y registra cambio en historial', async () => {
    const updatedRow = { ...BASE_ACTION, accion: 'Nuevo título' };
    const calls = setupMocks(BASE_ACTION, updatedRow);

    const req = mockReq({ body: { accion: 'Nuevo título' } });
    const res = mockRes();
    await updateAction(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedRow);
    // Debe haber un UPDATE con accion = ?
    const updateCall = calls.find(c => c.sql.includes('UPDATE ACCIONES_CORRECTIVAS SET'));
    expect(updateCall).toBeDefined();
    expect(updateCall.sql).toContain('accion = ?');
    expect(updateCall.params).toContain('Nuevo título');
    // Debe registrar el cambio en historial
    const histCall = calls.find(c => c.sql.includes('INSERT INTO ACCIONES_CORRECTIVAS_HIST') && c.params.includes(null) && String(c.params[4] || '').includes('Campos modificados'));
    expect(histCall).toBeDefined();
  });

  // --- TEST 4: Editar campo sin cambio real (mismo valor) ---
  test('editar campo con el mismo valor hace UPDATE pero NO registra en historial de cambios', async () => {
    const calls = setupMocks(BASE_ACTION, BASE_ACTION);

    const req = mockReq({ body: { accion: 'Revisar proceso' } }); // mismo valor
    const res = mockRes();
    await updateAction(req, res);

    expect(res.json).toHaveBeenCalledWith(BASE_ACTION);
    // Debe hacer UPDATE (el código siempre lo hace)
    const updateCall = calls.find(c => c.sql.includes('UPDATE ACCIONES_CORRECTIVAS SET'));
    expect(updateCall).toBeDefined();
    // NO debe insertar historial de "Campos modificados"
    const histCall = calls.find(c => c.sql.includes('INSERT INTO ACCIONES_CORRECTIVAS_HIST') && c.params && String(c.params[4] || '').includes('Campos modificados'));
    expect(histCall).toBeUndefined();
  });

  // --- TEST 5: Cambio de estado válido ---
  test('cambio de estado válido actualiza, inserta historial y notifica', async () => {
    const updatedRow = { ...BASE_ACTION, estado_accion: 'En_Progreso' };
    const calls = setupMocks(BASE_ACTION, updatedRow);

    const req = mockReq({ body: { estado_accion: 'En_Progreso' } });
    const res = mockRes();
    await updateAction(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedRow);
    // Historial de cambio de estado
    const histCall = calls.find(c => c.sql.includes('INSERT INTO ACCIONES_CORRECTIVAS_HIST') && c.params && c.params[1] === 'Pendiente' && c.params[2] === 'En_Progreso');
    expect(histCall).toBeDefined();
  });

  // --- TEST 6: Estado inválido retorna 400 ---
  test('estado inválido retorna 400', async () => {
    setupMocks(BASE_ACTION, BASE_ACTION);
    const req = mockReq({ body: { estado_accion: 'Inventado' } });
    const res = mockRes();
    await updateAction(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'invalid_state' });
  });

  // --- TEST 7: Comentario en cambio de estado se refleja en contenido_comentario ---
  test('comentario en cambio de estado actualiza contenido_comentario si no vino explícitamente', async () => {
    const updatedRow = { ...BASE_ACTION, estado_accion: 'Eficaz', contenido_comentario: 'Mi comentario' };
    const calls = setupMocks(BASE_ACTION, updatedRow);

    const req = mockReq({ body: { estado_accion: 'Eficaz', comentario: 'Mi comentario' } });
    const res = mockRes();
    await updateAction(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedRow);
    const updateCall = calls.find(c => c.sql.includes('UPDATE ACCIONES_CORRECTIVAS SET'));
    expect(updateCall.sql).toContain('contenido_comentario = ?');
    expect(updateCall.params).toContain('Mi comentario');
  });

  // --- TEST 8: Comentario NO sobreescribe si contenido_comentario vino explícito ---
  test('comentario NO sobreescribe contenido_comentario si payload ya lo incluye', async () => {
    const updatedRow = { ...BASE_ACTION, estado_accion: 'Eficaz', contenido_comentario: 'Explícito' };
    const calls = setupMocks(BASE_ACTION, updatedRow);

    const req = mockReq({ body: { estado_accion: 'Eficaz', comentario: 'Del estado', contenido_comentario: 'Explícito' } });
    const res = mockRes();
    await updateAction(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedRow);
    const updateCall = calls.find(c => c.sql.includes('UPDATE ACCIONES_CORRECTIVAS SET'));
    // contenido_comentario debe ser 'Explícito', no 'Del estado'
    const paramIndex = updateCall.params.indexOf('Explícito');
    expect(paramIndex).toBeGreaterThan(-1);
    // 'Del estado' NO debe estar en params del UPDATE (solo en el INSERT hist)
    expect(updateCall.params).not.toContain('Del estado');
  });

  // --- TEST 9: requiere_nueva_nc se convierte a 0/1 ---
  test('requiere_nueva_nc se convierte a entero binario', async () => {
    const updatedRow = { ...BASE_ACTION, requiere_nueva_nc: 1 };
    const calls = setupMocks(BASE_ACTION, updatedRow);

    const req = mockReq({ body: { requiere_nueva_nc: true } });
    const res = mockRes();
    await updateAction(req, res);

    const updateCall = calls.find(c => c.sql.includes('UPDATE ACCIONES_CORRECTIVAS SET'));
    expect(updateCall.params).toContain(1); // debe ser 1, no true
    expect(updateCall.params).not.toContain(true);
  });

  // --- TEST 10: Múltiples campos + estado simultáneamente ---
  test('editar múltiples campos y estado al mismo tiempo', async () => {
    const updatedRow = { ...BASE_ACTION, accion: 'Nueva acción', contenido_comentario: 'Nuevo comentario', estado_accion: 'En_Progreso' };
    const calls = setupMocks(BASE_ACTION, updatedRow);

    const req = mockReq({
      body: {
        accion: 'Nueva acción',
        contenido_comentario: 'Nuevo comentario',
        estado_accion: 'En_Progreso'
      }
    });
    const res = mockRes();
    await updateAction(req, res);

    expect(res.json).toHaveBeenCalledWith(updatedRow);
    const updateCall = calls.find(c => c.sql.includes('UPDATE ACCIONES_CORRECTIVAS SET'));
    expect(updateCall.sql).toContain('accion = ?');
    expect(updateCall.sql).toContain('contenido_comentario = ?');
    expect(updateCall.sql).toContain('estado_accion = ?');
  });
});
