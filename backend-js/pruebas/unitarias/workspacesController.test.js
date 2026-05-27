jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn(), query: jest.fn() }
}));

const { pool } = require('../../src/db');
const { createWorkspace, getWorkspace, listWorkspaces, updateWorkspace, deleteWorkspace } = require('../../src/controllers/useWorkspaces');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('useWorkspaces controller (unit)', () => {
  beforeEach(()=> jest.clearAllMocks());

  test('createWorkspace returns 201 and id', async () => {
    pool.execute.mockResolvedValueOnce([{ insertId: 7 }]);
    pool.query.mockResolvedValueOnce(); // seeding ok
    const req = { body: { nombre_cliente: 'ACME' } };
    const res = mockRes();
    await createWorkspace(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 7 });
  });

  test('getWorkspace not found returns 404', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const req = { params: { id: 999 } };
    const res = mockRes();
    await getWorkspace(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
