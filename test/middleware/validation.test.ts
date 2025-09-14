import request from 'supertest';
import express from 'express';
import { validatePaymentRequest, validateTransactionQuery } from '../../src/middleware/validation.middleware';

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('validatePaymentRequest', () => {
    beforeEach(() => {
      app.post('/test-payment', validatePaymentRequest, (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    it('should accept valid payment request', async () => {
      const validRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const response = await request(app).post('/test-payment').send(validRequest).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(validRequest);
    });

    it('should reject negative amount', async () => {
      const invalidRequest = {
        amount: -100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const response = await request(app).post('/test-payment').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details.validationErrors).toContainEqual(
        expect.objectContaining({
          field: 'amount',
          message: 'Amount must be a positive number',
        })
      );
    });

    it('should reject amount exceeding maximum', async () => {
      const invalidRequest = {
        amount: 2000000,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const response = await request(app).post('/test-payment').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid currency', async () => {
      const invalidRequest = {
        amount: 100,
        currency: 'INVALID',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const response = await request(app).post('/test-payment').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid email', async () => {
      const invalidRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'invalid-email',
      };

      const response = await request(app).post('/test-payment').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject empty source', async () => {
      const invalidRequest = {
        amount: 100,
        currency: 'USD',
        source: '',
        email: 'user@example.com',
      };

      const response = await request(app).post('/test-payment').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject missing required fields', async () => {
      const invalidRequest = {
        amount: 100,
        // Missing currency, source, email
      };

      const response = await request(app).post('/test-payment').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details.validationErrors).toHaveLength(3);
    });

    it('should accept valid currencies', async () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

      for (const currency of validCurrencies) {
        const paymentRequest = {
          amount: 100,
          currency,
          source: 'tok_test',
          email: 'user@example.com',
        };

        const response = await request(app).post('/test-payment').send(paymentRequest).expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should strip unknown fields', async () => {
      const requestWithUnknownFields = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
        unknownField: 'should be stripped',
        anotherUnknown: 123,
      };

      const response = await request(app)
        .post('/test-payment')
        .send(requestWithUnknownFields)
        .expect(200);

      expect(response.body.data).not.toHaveProperty('unknownField');
      expect(response.body.data).not.toHaveProperty('anotherUnknown');
    });
  });

  describe('validateTransactionQuery', () => {
    beforeEach(() => {
      app.get('/test-transactions', validateTransactionQuery, (req, res) => {
        res.json({ success: true, query: req.query });
      });
    });

    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get('/test-transactions?email=test@example.com&status=success&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.query.email).toBe('test@example.com');
      expect(response.body.query.status).toBe('success');
      expect(response.body.query.page).toBe(1);
      expect(response.body.query.limit).toBe(10);
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .get('/test-transactions?status=invalid_status')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid provider', async () => {
      const response = await request(app)
        .get('/test-transactions?provider=invalid_provider')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app).get('/test-transactions?email=invalid-email').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid page number', async () => {
      const response = await request(app).get('/test-transactions?page=0').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid limit', async () => {
      const response = await request(app).get('/test-transactions?limit=200').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app)
        .get('/test-transactions?startDate=invalid-date')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should accept valid date range', async () => {
      const response = await request(app)
        .get(
          '/test-transactions?startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z'
        )
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should set default values', async () => {
      const response = await request(app).get('/test-transactions').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.query.page).toBe(1);
      expect(response.body.query.limit).toBe(10);
      expect(response.body.query.sortOrder).toBe('desc');
    });

    it('should strip unknown query parameters', async () => {
      const response = await request(app)
        .get('/test-transactions?email=test@example.com&unknownParam=value')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.query).not.toHaveProperty('unknownParam');
    });
  });
});
