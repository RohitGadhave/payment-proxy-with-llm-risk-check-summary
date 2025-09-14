import request from 'supertest';
import app from '../../src/app';

describe('API Integration Tests', () => {
  describe('POST /api/charge', () => {
    it('should process payment successfully', async () => {
      const paymentRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const response = await request(app).post('/api/charge').send(paymentRequest).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('riskScore');
      expect(response.body.data).toHaveProperty('explanation');
      expect(response.body.data).toHaveProperty('timestamp');
    });

    it('should block high-risk payment', async () => {
      const highRiskRequest = {
        amount: 10000,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@test.ru',
      };

      const response = await request(app).post('/api/charge').send(highRiskRequest).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('blocked');
      expect(response.body.data.provider).toBe('blocked');
      expect(response.body.data.riskScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should return 400 for invalid request', async () => {
      const invalidRequest = {
        amount: -100,
        currency: 'INVALID',
        source: '',
        email: 'invalid-email',
      };

      const response = await request(app).post('/api/charge').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle different currencies', async () => {
      const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

      for (const currency of currencies) {
        const paymentRequest = {
          amount: 100,
          currency,
          source: 'tok_test',
          email: 'user@example.com',
        };

        const response = await request(app).post('/api/charge').send(paymentRequest).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });
  });

  describe('GET /api/transactions', () => {
    it('should return empty list initially', async () => {
      const response = await request(app).get('/api/transactions').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(0);
      expect(response.body.data.stats.total).toBe(0);
    });

    it('should return transactions after processing payments', async () => {
      // Process a payment first
      const paymentRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      await request(app).post('/api/charge').send(paymentRequest).expect(200);

      // Get transactions
      const response = await request(app).get('/api/transactions').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.stats.total).toBe(1);
    });

    it('should support filtering by email', async () => {
      // Process multiple payments
      const payments = [
        {
          amount: 100,
          currency: 'USD',
          source: 'tok_test1',
          email: 'user1@example.com',
        },
        {
          amount: 200,
          currency: 'USD',
          source: 'tok_test2',
          email: 'user2@example.com',
        },
      ];

      for (const payment of payments) {
        await request(app).post('/api/charge').send(payment).expect(200);
      }

      // Filter by email
      const response = await request(app)
        .get('/api/transactions?email=user1@example.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].email).toBe('user1@example.com');
    });

    it('should support pagination', async () => {
      // Process multiple payments
      for (let i = 0; i < 5; i++) {
        const payment = {
          amount: 100 + i * 10,
          currency: 'USD',
          source: `tok_test${i}`,
          email: `user${i}@example.com`,
        };

        await request(app).post('/api/charge').send(payment).expect(200);
      }

      // Test pagination
      const response = await request(app).get('/api/transactions?page=1&limit=2').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
      expect(response.body.data.pagination.total).toBe(5);
    });
  });

  describe('GET /api/transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      const paymentRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const response = await request(app).post('/api/charge').send(paymentRequest).expect(200);

      transactionId = response.body.data.transactionId;
    });

    it('should return specific transaction', async () => {
      const response = await request(app).get(`/api/transactions/${transactionId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transactionId);
      expect(response.body.data.amount).toBe(100);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app).get('/api/transactions/non-existent-id').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });
  });

  describe('GET /api/transactions/stats', () => {
    it('should return statistics', async () => {
      const response = await request(app).get('/api/transactions/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('byProvider');
      expect(response.body.data).toHaveProperty('totalAmount');
      expect(response.body.data).toHaveProperty('averageAmount');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

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
