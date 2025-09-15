import { OpenAIService } from '../../src/services/llm.service';
import { FraudAnalysisData, FraudAnalysisResult } from '../../src/types/fraud';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'This payment was processed successfully due to low risk factors.',
                },
              },
            ],
          }),
        },
      },
    })),
  };
});

describe('OpenAIService', () => {
  let llmService: OpenAIService;

  beforeEach(() => {
    llmService = new OpenAIService();
  });

  describe('generateExplanation', () => {
    const mockData: FraudAnalysisData = {
      amount: 100,
      currency: 'USD',
      email: 'user@example.com',
      domain: 'example.com',
      source: 'tok_test',
      timestamp: new Date(),
    };

    const mockResult: FraudAnalysisResult = {
      riskScore: 0.2,
      triggeredRules: ['high_value_currency'],
      explanation: '',
      isHighRisk: false,
    };

    it('should generate explanation for successful payment', async () => {
      const explanation = await llmService.generateExplanation(
        mockData,
        mockResult,
        'stripe',
        'success'
      );

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('should generate explanation for blocked payment', async () => {
      const highRiskResult: FraudAnalysisResult = {
        ...mockResult,
        riskScore: 0.8,
        isHighRisk: true,
        triggeredRules: ['large_amount', 'suspicious_domain'],
      };

      const explanation = await llmService.generateExplanation(
        mockData,
        highRiskResult,
        'blocked',
        'blocked'
      );

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation.length).toBeGreaterThan(0);
    });

    it('should use fallback explanation when OpenAI fails', async () => {
      // Mock OpenAI to throw an error
      const mockOpenAI = jest.requireMock('openai').default;
      const mockInstance = new mockOpenAI();
      mockInstance.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const explanation = await llmService.generateExplanation(
        mockData,
        mockResult,
        'stripe',
        'success'
      );

      expect(explanation).toBeDefined();
      expect(typeof explanation).toBe('string');
      expect(explanation).toContain(
        'This payment was processed successfully due to low risk factors.'
      );
    });

    it('should cache explanations', async () => {
      const explanation1 = await llmService.generateExplanation(
        mockData,
        mockResult,
        'stripe',
        'success'
      );

      const explanation2 = await llmService.generateExplanation(
        mockData,
        mockResult,
        'stripe',
        'success'
      );

      expect(explanation1).toBe(explanation2);
    });

    it('should clear cache', () => {
      llmService.clearCache();
      // Cache should be empty after clearing
      expect(llmService['cache'].size()).toBe(0);
    });
  });
});
