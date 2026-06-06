jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn() }
}));

const { pool } = require('../../src/db');
const { updateAction } = require('../../src/controllers/accionesController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('accionesController (unit)', ()=>{
  beforeEach(()=> jest.clearAllMocks());

  test('updateAction success updates and returns updated row', async ()=>{
    const actionRow = [{ id: 20, estado_accion: 'Pendiente', auditoria_nc_id: 3 }];
    pool.execute.mockResolvedValueOnce([actionRow]); // 1. select action
    pool.execute.mockResolvedValueOnce(); // 2. insert hist
    pool.execute.mockResolvedValueOnce([[]]); // 3. select responsables
    pool.execute.mockResolvedValueOnce(); // 4. update
    pool.execute.mockResolvedValueOnce([[{ id:20, estado_accion:'En_Progreso' }]]); // 5. final select

    const req = { params: { id: '20' }, body: { estado_accion: 'En_Progreso' }, user: { id: 2 } };
    const res = mockRes();
    await updateAction(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ estado_accion: 'En_Progreso' }));
  });
});