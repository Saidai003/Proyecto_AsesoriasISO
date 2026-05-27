const bcrypt = require('bcryptjs');
jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn() }
}));

const { pool } = require('../../src/db');
const { createUser, updateUser, deleteUser, getUser, listUsers } = require('../../src/controllers/userController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('userController (unit)', () => {
  beforeEach(()=>{ jest.clearAllMocks(); });

  test('createUser success returns 201 with id', async () => {
    // existing check -> empty
    pool.execute.mockResolvedValueOnce([[]]);
    // workspace exists
    pool.execute.mockResolvedValueOnce([[{ id: 2 }]]);
    // role exists
    pool.execute.mockResolvedValueOnce([[{ id: 3 }]]);
    // insert result
    pool.execute.mockResolvedValueOnce([{ insertId: 42 }]);

    const req = { body: { nombre: 'X', email: 'a@b.com', password: 'p', workspace_id: 2, role_id: 3 } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 42 });
  });

  test('createUser missing fields returns 400', async () => {
    const req = { body: { nombre: 'X' } };
    const res = mockRes();
    await createUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getUser not found returns 404', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const req = { params: { id: 999 } };
    const res = mockRes();
    await getUser(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('deleteUser returns id', async () => {
    pool.execute.mockResolvedValueOnce();
    const req = { params: { id: 5 } };
    const res = mockRes();
    await deleteUser(req, res);
    expect(res.json).toHaveBeenCalledWith({ id: 5 });
  });
});
