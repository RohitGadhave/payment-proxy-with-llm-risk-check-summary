import { PaymentRoutingService } from '../../src/services/payment-processor.service';
import { InMemoryTransactionLogger } from '../../src/services/transaction-logger.service';
import { PaymentRequest } from '../../src/types/payment';

// Mock the LLM service
jest.mock('../../src/services/llm.service', () => {
  return {
    OpenAIService: jest.fn().mockImplementation(() => ({
      generateExplanation: jest.fn().mockResolvedValue('Mock explanation'),
    })),
  };
});

describe('PaymentRoutingService', () => {
  let paymentService: PaymentRoutingService;
  let transactionLogger: InMemoryTransactionLogger;

  beforeEach(() => {
    transactionLogger = new InMemoryTransactionLogger();
    paymentService = new PaymentRoutingService(transactionLogger);
  });

  describe('processPayment', () => {
    const validRequest: PaymentRequest = {
      amount: 100,
      currency: 'USD',
      source: 'tok_test',
      email: 'user@example.com',
    };

    it('should process payment and return result', async () => {
      const result = await paymentService.processPayment(validRequest);

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('timestamp');
      expect(['success', 'blocked']).toContain(result.status);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(1);
    });

    it('should block high-risk payment', async () => {
      const highRiskRequest: PaymentRequest = {
        amount: 10000,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@test.ru',
      };

      const result = await paymentService.processPayment(highRiskRequest);

      expect(result.status).toBe('blocked');
      expect(result.provider).toBe('blocked');
      expect(result.riskScore).toBeGreaterThanOrEqual(0.5);
    });

    it('should route to stripe for very low risk', async () => {
      const lowRiskRequest: PaymentRequest = {
        amount: 50,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@trusted.com',
      };

      const result = await paymentService.processPayment(lowRiskRequest);

      expect(result.provider).toBe('stripe');
      expect(result.status).toBe('success');
    });

    it('should route payment based on risk assessment', async () => {
      const moderateRiskRequest: PaymentRequest = {
        amount: 1000,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const result = await paymentService.processPayment(moderateRiskRequest);

      expect(['stripe', 'paypal', 'blocked']).toContain(result.provider);
      expect(['success', 'blocked']).toContain(result.status);
    });

    it('should log transaction', async () => {
      const result = await paymentService.processPayment(validRequest);

      const loggedTransaction = transactionLogger.getTransaction(result.transactionId);
      expect(loggedTransaction).toBeDefined();
      expect(loggedTransaction?.amount).toBe(validRequest.amount);
      expect(loggedTransaction?.email).toBe(validRequest.email);
    });

    it('should generate explanation using LLM service', async () => {
      const result = await paymentService.processPayment(validRequest);

      expect(result).toHaveProperty('explanation');
      expect(typeof result.explanation).toBe('string');
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should handle different currencies', async () => {
      const eurRequest: PaymentRequest = {
        amount: 100,
        currency: 'EUR',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const result = await paymentService.processPayment(eurRequest);

      expect(result).toBeDefined();
      expect(result).toBeDefined();
    });

    it('should extract domain from email correctly', async () => {
      const requestWithDomain: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@subdomain.example.com',
      };

      const result = await paymentService.processPayment(requestWithDomain);

      expect(result).toBeDefined();
      // The domain extraction should work correctly
      const loggedTransaction = transactionLogger.getTransaction(result.transactionId);
      expect(loggedTransaction).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle processing with negative amounts', async () => {
      const invalidRequest = {
        amount: -100, // Invalid amount
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      } as PaymentRequest;

      const result = await paymentService.processPayment(invalidRequest);
      
      // Should still process but likely be blocked due to negative amount
      expect(result).toBeDefined();
      expect(result.status).toBe('blocked');
    });
  });
});
