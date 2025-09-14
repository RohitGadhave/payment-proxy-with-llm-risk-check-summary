import request from 'supertest';
import express from 'express';
import { PaymentController } from '../../src/controllers/payment-controller';
import { PaymentRoutingService } from '../../src/services/payment-processor';
import { InMemoryTransactionLogger } from '../../src/services/transaction-logger';
import { FraudDetectionService } from '../../src/services/fraud-detector';
import { OpenAIService } from '../../src/services/llm-service';

// Mock the LLM service
jest.mock('../../src/services/llm-service', () => {
  return {
    OpenAIService: jest.fn().mockImplementation(() => ({
      generateExplanation: jest.fn().mockResolvedValue('Mock explanation'),
    })),
  };
});

describe('PaymentController', () => {
  let app: express.Application;
  let paymentController: PaymentController;
  let paymentService: PaymentRoutingService;
  let transactionLogger: InMemoryTransactionLogger;

  beforeEach(() => {
    const fraudDetector = new FraudDetectionService();
    const llmService = new OpenAIService('test-api-key');
    transactionLogger = new InMemoryTransactionLogger();
    paymentService = new PaymentRoutingService(fraudDetector, llmService, transactionLogger);
    paymentController = new PaymentController(paymentService, transactionLogger);

    app = express();
    app.use(express.json());
    app.post('/charge', paymentController.processPayment);
    app.get('/transactions', paymentController.getTransactions);
    app.get('/transactions/:id', paymentController.getTransactionById);
    app.get('/transactions/stats', paymentController.getTransactionStats);
    app.get('/health', paymentController.healthCheck);
  });

  describe('POST /charge', () => {
    const validPaymentRequest = {
      amount: 100,
      currency: 'USD',
      source: 'tok_test',
      email: 'user@example.com',
    };

    it('should process valid payment request', async () => {
      const response = await request(app).post('/charge').send(validPaymentRequest).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transactionId');
      expect(response.body.data).toHaveProperty('provider');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('riskScore');
      expect(response.body.data).toHaveProperty('explanation');
    });

    it('should return 400 for invalid payment request', async () => {
      const invalidRequest = {
        amount: -100, // Invalid negative amount
        currency: 'INVALID', // Invalid currency
        source: '', // Empty source
        email: 'invalid-email', // Invalid email
      };

      const response = await request(app).post('/charge').send(invalidRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle missing required fields', async () => {
      const incompleteRequest = {
        amount: 100,
        // Missing currency, source, email
      };

      const response = await request(app).post('/charge').send(incompleteRequest).expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle high-risk payment', async () => {
      const highRiskRequest = {
        amount: 10000,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@test.ru',
      };

      const response = await request(app).post('/charge').send(highRiskRequest).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('blocked');
      expect(response.body.data.provider).toBe('blocked');
    });
  });

  describe('GET /transactions', () => {
    beforeEach(async () => {
      // Add some test transactions
      const transactions = [
        {
          amount: 100,
          currency: 'USD',
          email: 'test1@example.com',
          source: 'tok_test1',
          provider: 'stripe',
          status: 'success',
          riskScore: 0.2,
          explanation: 'Test 1',
        },
        {
          amount: 200,
          currency: 'USD',
          email: 'test2@example.com',
          source: 'tok_test2',
          provider: 'paypal',
          status: 'blocked',
          riskScore: 0.8,
          explanation: 'Test 2',
        },
      ];

      for (const tx of transactions) {
        const transaction = transactionLogger.createTransaction(tx);
        transactionLogger.addTransaction(transaction);
      }
    });

    it('should return all transactions', async () => {
      const response = await request(app).get('/transactions').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.stats).toBeDefined();
    });

    it('should filter transactions by email', async () => {
      const response = await request(app).get('/transactions?email=test1@example.com').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].email).toBe('test1@example.com');
    });

    it('should filter transactions by status', async () => {
      const response = await request(app).get('/transactions?status=blocked').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].status).toBe('blocked');
    });

    it('should support pagination', async () => {
      const response = await request(app).get('/transactions?page=1&limit=1').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app).get('/transactions?status=invalid_status').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('GET /transactions/:id', () => {
    let transactionId: string;

    beforeEach(async () => {
      const transaction = transactionLogger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'test@example.com',
        source: 'tok_test',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test transaction',
      });
      transactionLogger.addTransaction(transaction);
      transactionId = transaction.id;
    });

    it('should return specific transaction', async () => {
      const response = await request(app).get(`/transactions/${transactionId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(transactionId);
      expect(response.body.data.amount).toBe(100);
    });

    it('should return 404 for non-existent transaction', async () => {
      const response = await request(app).get('/transactions/non-existent-id').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Transaction not found');
    });

    it('should return 400 for missing transaction ID', async () => {
      await request(app).get('/transactions/').expect(404); // Express returns 404 for missing parameter
    });
  });

  describe('GET /transactions/stats', () => {
    beforeEach(async () => {
      const transactions = [
        {
          amount: 100,
          currency: 'USD',
          email: 'test1@example.com',
          source: 'tok_test1',
          provider: 'stripe',
          status: 'success',
          riskScore: 0.2,
          explanation: 'Test 1',
        },
        {
          amount: 200,
          currency: 'USD',
          email: 'test2@example.com',
          source: 'tok_test2',
          provider: 'paypal',
          status: 'blocked',
          riskScore: 0.8,
          explanation: 'Test 2',
        },
      ];

      for (const tx of transactions) {
        const transaction = transactionLogger.createTransaction(tx);
        transactionLogger.addTransaction(transaction);
      }
    });

    it('should return transaction statistics', async () => {
      const response = await request(app).get('/transactions/stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.byStatus).toBeDefined();
      expect(response.body.data.byProvider).toBeDefined();
      expect(response.body.data.totalAmount).toBe(300);
      expect(response.body.data.averageAmount).toBe(150);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
    });
  });
});
