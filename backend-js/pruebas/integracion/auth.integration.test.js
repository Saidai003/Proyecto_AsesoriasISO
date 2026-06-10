if(!process.env.RUN_INTEGRATION){
  test.skip('integration tests skipped unless RUN_INTEGRATION=true', () => {});
} else {
  const request = require('supertest');
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const agent = request(baseUrl);
  describe('Auth integration', () => {
    test('server responds to /', async () => {
      const res = await agent.get('/');
      expect(res.statusCode).toBe(200);
    });
  });
}
