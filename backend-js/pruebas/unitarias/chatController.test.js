jest.mock('../../src/db', () => ({
  pool: { execute: jest.fn(), query: jest.fn() }
}));
jest.mock('../../src/services/sse', () => ({
  sendEvent: jest.fn()
}));

const { pool } = require('../../src/db');
const { sendEvent } = require('../../src/services/sse');
const { getMessages, postMessage } = require('../../src/controllers/chatController');

function mockRes(){
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('chatController (unit)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getMessages parses metadata string from database', async () => {
    // Mock database row with metadata as a JSON string
    pool.execute.mockResolvedValueOnce([[
      { id: 1, contenido: 'Hola', metadata: '{"attachments":[{"type":"evidencia","id":5}]}' }
    ]]);

    const req = { query: { requisito_id: 10 } };
    const res = mockRes();

    await getMessages(req, res);

    expect(res.json).toHaveBeenCalledWith([
      {
        id: 1,
        contenido: 'Hola',
        metadata: { attachments: [{ type: 'evidencia', id: 5 }] }
      }
    ]);
  });

  test('postMessage parses metadata string before broadcasting and returning', async () => {
    // Mock user resolve query (SELECT nombre, role_id FROM USUARIOS WHERE id = ?)
    pool.execute.mockResolvedValueOnce([[
      { nombre: 'Test User', role_id: 1 }
    ]]);
    // Mock role query
    pool.execute.mockResolvedValueOnce([[
      { nombre: 'Evaluador' }
    ]]);
    // Mock insert result
    pool.execute.mockResolvedValueOnce([{ insertId: 100 }]);
    // Mock select inserted message with stringified metadata
    pool.execute.mockResolvedValueOnce([[
      { id: 100, contenido: 'Mensaje nuevo', metadata: '{"attachments":[]}' }
    ]]);

    const req = {
      headers: { authorization: 'Bearer test-token' },
      user: { id: 2, email: 't@example.com', workspace_id: 1 },
      body: { requisito_id: 10, contenido: 'Mensaje nuevo', metadata: { attachments: [] } }
    };
    const res = mockRes();

    await postMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 100,
      contenido: 'Mensaje nuevo',
      metadata: { attachments: [] }
    });
    expect(sendEvent).toHaveBeenCalledWith('chat:new', {
      id: 100,
      contenido: 'Mensaje nuevo',
      metadata: { attachments: [] }
    });
  });
});
