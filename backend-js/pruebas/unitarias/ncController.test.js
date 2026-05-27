jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn(), query: jest.fn() }
}));

const { pool } = require('../../src/db');
const { createNC, deleteNC } = require('../../src/controllers/ncController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('ncController (unit)', ()=>{
  beforeEach(()=> jest.clearAllMocks());

  test('createNC with existing evaluacion returns 201', async ()=>{
    // evaluacion exists
    pool.execute.mockResolvedValueOnce([[{ id: 5 }]]);
    // insert NC
    pool.execute.mockResolvedValueOnce([{ insertId: 11 }]);
    // responses for responsables insert and notifications
    pool.execute.mockResolvedValue();

    const req = { user: { id: 2, workspace_id: 1 }, body: { requisito_base_id: 10, titulo: 'NC Test', responsables: [3] } };
    const res = mockRes();
    await createNC(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 11 });
  });

  test('deleteNC missing id returns 400', async ()=>{
    const req = { params: { } };
    const res = mockRes();
    await deleteNC(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
