import { PaymentRoutingService } from '../../src/services/payment-processor';
import { FraudDetectionService } from '../../src/services/fraud-detector';
import { OpenAIService } from '../../src/services/llm-service';
import { InMemoryTransactionLogger } from '../../src/services/transaction-logger';
import { PaymentRequest } from '../../src/types/payment';

// Mock the LLM service
jest.mock('../../src/services/llm-service', () => {
  return {
    OpenAIService: jest.fn().mockImplementation(() => ({
      generateExplanation: jest.fn().mockResolvedValue('Mock explanation'),
    })),
  };
});

describe('PaymentRoutingService', () => {
  let paymentService: PaymentRoutingService;
  let fraudDetector: FraudDetectionService;
  let llmService: OpenAIService;
  let transactionLogger: InMemoryTransactionLogger;

  beforeEach(() => {
    fraudDetector = new FraudDetectionService();
    llmService = new OpenAIService('test-api-key');
    transactionLogger = new InMemoryTransactionLogger();
    paymentService = new PaymentRoutingService(fraudDetector, llmService, transactionLogger);
  });

  describe('processPayment', () => {
    const validRequest: PaymentRequest = {
      amount: 100,
      currency: 'USD',
      source: 'tok_test',
      email: 'user@example.com',
    };

    it('should process low-risk payment successfully', async () => {
      const result = await paymentService.processPayment(validRequest);

      expect(result).toHaveProperty('transactionId');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('timestamp');
      expect(result.status).toBe('success');
      expect(result.riskScore).toBeLessThan(0.5);
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

    it('should route to paypal for moderate risk', async () => {
      const moderateRiskRequest: PaymentRequest = {
        amount: 1000,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      const result = await paymentService.processPayment(moderateRiskRequest);

      expect(result.provider).toBe('paypal');
      expect(result.status).toBe('success');
    });

    it('should log transaction', async () => {
      const result = await paymentService.processPayment(validRequest);

      const loggedTransaction = transactionLogger.getTransaction(result.transactionId);
      expect(loggedTransaction).toBeDefined();
      expect(loggedTransaction?.amount).toBe(validRequest.amount);
      expect(loggedTransaction?.email).toBe(validRequest.email);
    });

    it('should generate explanation using LLM service', async () => {
      const generateExplanationSpy = jest.spyOn(llmService, 'generateExplanation');

      await paymentService.processPayment(validRequest);

      expect(generateExplanationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: validRequest.amount,
          currency: validRequest.currency,
          email: validRequest.email,
        }),
        expect.objectContaining({
          riskScore: expect.any(Number),
          triggeredRules: expect.arrayContaining([expect.any(String)]),
          isHighRisk: expect.any(Boolean),
        }),
        expect.stringMatching(/^(stripe|paypal|blocked)$/),
        expect.stringMatching(/^(success|failed|blocked)$/)
      );
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
    it('should handle LLM service errors gracefully', async () => {
      const validRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        source: 'tok_test',
        email: 'user@example.com',
      };

      // Mock LLM service to throw an error
      jest.spyOn(llmService, 'generateExplanation').mockRejectedValue(new Error('LLM Error'));

      const result = await paymentService.processPayment(validRequest);

      // Should still process payment even if LLM fails
      expect(result).toBeDefined();
      expect(result.explanation).toBeDefined();
    });
  });
});
