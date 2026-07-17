jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn(), query: jest.fn() }
}));

const { pool } = require('../../src/db');
const { autoUpdateEstado } = require('../../src/controllers/evaluationsController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('evaluationsController (unit)', ()=>{
  beforeEach(()=> jest.clearAllMocks());

  test('autoUpdateEstado returns 404 if evaluation not found', async ()=>{
    pool.execute.mockResolvedValueOnce([[]]); // select evaluations returns empty

    const req = { user: { id: 2, role: 'Evaluador', workspace_id: 1 }, params: { id: 55 } };
    const res = mockRes();
    await autoUpdateEstado(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'not_found' });
  });

  test('autoUpdateEstado returns NA state without modifying if already NA', async ()=>{
    pool.execute.mockResolvedValueOnce([[{ id: 55, estado_cumplimiento: 'NA' }]]);

    const req = { user: { id: 2, role: 'Evaluador', workspace_id: 1 }, params: { id: 55 } };
    const res = mockRes();
    await autoUpdateEstado(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, estado_cumplimiento: 'NA', changed: false });
  });

  test('autoUpdateEstado calculates Cumple when all evidences are Aceptado and 0 open NCs', async ()=>{
    pool.execute.mockResolvedValueOnce([[{ id: 55, estado_cumplimiento: 'No cumple' }]]); // current
    pool.execute.mockResolvedValueOnce([[{ estado_validacion_archivo: 'Aceptado' }]]); // evidences
    pool.execute.mockResolvedValueOnce([[{ estado_flujo: 'Cerrada' }]]); // NCs (0 open)
    pool.execute.mockResolvedValueOnce([]); // update query return (unused in expect)
    pool.execute.mockResolvedValueOnce([]); // history insert return (unused in expect)

    const req = { user: { id: 2, role: 'Evaluador', workspace_id: 1 }, params: { id: 55 } };
    const res = mockRes();
    await autoUpdateEstado(req, res);
    expect(res.json).toHaveBeenCalledWith({ ok: true, estado_cumplimiento: 'Cumple', changed: true });
    expect(pool.execute).toHaveBeenNthCalledWith(4,
      'UPDATE EVALUACION_REQUISITO SET estado_cumplimiento = ?, ultima_edicion_por = ?, fecha_ultima_edicion = NOW() WHERE id = ?',
      ['Cumple', 2, 55]
    );
  });
});
