import request from 'supertest';
import app from '../../src/app';

describe('API Integration Tests', () => {
  describe('GET /api/monitor/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/monitor/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment Routing API');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route /api/unknown-route not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/charge')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate limiting', () => {
    it('should handle rate limiting', async () => {
      // Make many requests quickly
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app).post('/api/charge').send({
            amount: 100,
            currency: 'USD',
            source: 'tok_test',
            email: 'user@example.com',
          })
        );

      const responses = await Promise.all(requests);

      // All requests should succeed (rate limit is high for testing)
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });
});
