jest.mock('../../src/db', () => ({
  pool: { query: jest.fn(), execute: jest.fn() }
}));

const { pool } = require('../../src/db');
const { listByRequisito, downloadEvidence } = require('../../src/controllers/evidenceController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.setHeader = jest.fn();
  return res;
}

describe('evidenceController (unit)', ()=>{
  beforeEach(()=> jest.clearAllMocks());

  test('listByRequisito returns evidencias list', async ()=>{
    const now = new Date().toISOString().slice(0,10);
    pool.query.mockResolvedValueOnce([[{ id: 1, evaluacion_requisito_id: 5, nombre_archivo: 'f.pdf', fecha_carga: now }]]);
    const req = { params: { id: '5' } };
    const res = mockRes();
    await listByRequisito(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ evidencias: expect.any(Array) }));
  });

  test('downloadEvidence returns 404 if not found', async ()=>{
    pool.query.mockResolvedValueOnce([[]]);
    const req = { params: { id: '999' }, user: { id: 1 } };
    const res = mockRes();
    await downloadEvidence(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
