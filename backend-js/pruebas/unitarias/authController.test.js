const bcrypt = require('bcryptjs');
jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn() }
}));
jest.mock('../../src/auth', () => ({
  signAccessToken: jest.fn(() => 'access-token'),
  createRefreshSession: jest.fn(async () => 'refresh-token'),
  getSession: jest.fn(async () => null),
  revokeRefreshSession: jest.fn(async () => {}),
  REFRESH_TOKEN_MINUTES: 1440
}));

const { pool } = require('../../src/db');
const { login, refresh, logout } = require('../../src/controllers/authController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  res.clearCookie = jest.fn(() => res);
  return res;
}

describe('authController (unit)', () => {
  beforeEach(()=>{ jest.clearAllMocks(); });

  test('login success returns accessToken and sets cookie', async () => {
    const password = 'secret';
    const hash = await bcrypt.hash(password, 10);
    // first pool.execute call returns user row
    pool.execute.mockResolvedValueOnce([[{ id:1, nombre:'Test', email:'t@example.com', password_hash: hash, role_id: null, workspace_id: 2 }]]);
    const req = { body: { email: 't@example.com', password } };
    const res = mockRes();

    await login(req, res);

    expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh-token', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'access-token' }));
  });

  test('login with missing fields returns 400', async () => {
    const req = { body: { email: '' } };
    const res = mockRes();
    await login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('refresh without cookie returns 401', async () => {
    const req = { cookies: {} };
    const res = mockRes();
    await refresh(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('logout clears cookie and revokes session', async () => {
    const req = { cookies: { refreshToken: 'abc' } };
    const res = mockRes();
    await logout(req, res);
    expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/' });
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});
