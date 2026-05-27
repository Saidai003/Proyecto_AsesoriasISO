if(!process.env.RUN_INTEGRATION){
  test.skip('integration tests skipped unless RUN_INTEGRATION=true', () => {});
} else {
  const request = require('supertest');
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const agent = request(baseUrl);
  describe('Users integration', () => {
    test('list users endpoint', async () => {
      const res = await agent.get('/api/users');
      expect([200,401,403]).toContain(res.statusCode);
    });
  });
}
