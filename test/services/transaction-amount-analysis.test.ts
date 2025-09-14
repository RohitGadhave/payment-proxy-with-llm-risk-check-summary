import { FraudDetectionService } from '../../src/services/fraud-detector.service';
import { FraudAnalysisData } from '../../src/types/fraud';

describe('Transaction Amount Analysis', () => {
  let fraudDetector: FraudDetectionService;

  beforeEach(() => {
    fraudDetector = new FraudDetectionService();
  });

  describe('Round Number Amount Detection', () => {
    it('should detect suspicious round number amounts', async () => {
      const testCases = [
        { amount: 100, expected: true },
        { amount: 500, expected: true },
        { amount: 1000, expected: true },
        { amount: 10000, expected: true },
        { amount: 99.99, expected: false },
        { amount: 150, expected: false },
        { amount: 2500, expected: false },
      ];

      for (const testCase of testCases) {
        const data: FraudAnalysisData = {
          amount: testCase.amount,
          currency: 'USD',
          email: 'test@example.com',
          domain: 'example.com',
          timestamp: new Date(),
        };

        const result = await fraudDetector.analyzeRisk(data);
        const hasRoundNumberRule = result.triggeredRules.includes('round_number_amount');
        expect(hasRoundNumberRule).toBe(testCase.expected);
      }
    });
  });

  describe('Gradual Amount Increase Detection', () => {
    it('should detect gradual amount increases', async () => {
      const data: FraudAnalysisData = {
        amount: 500,
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 500,
          currency: 'USD',
          previousAmounts: [100, 200, 300, 400], // Gradual increase pattern
          userAverageAmount: 250,
          userStandardDeviation: 100,
          merchantCategory: 'retail',
          isFirstTimeTransaction: false,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('gradual_amount_increase');
    });

    it('should not trigger for non-gradual increases', async () => {
      const data: FraudAnalysisData = {
        amount: 500,
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 500,
          currency: 'USD',
          previousAmounts: [100, 50, 300, 200], // No clear pattern
          userAverageAmount: 250,
          userStandardDeviation: 100,
          merchantCategory: 'retail',
          isFirstTimeTransaction: false,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).not.toContain('gradual_amount_increase');
    });
  });

  describe('Under Reporting Threshold Detection', () => {
    it('should detect amounts just under reporting threshold', async () => {
      const data: FraudAnalysisData = {
        amount: 9999.99, // Just under $10,000 threshold
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 9999.99,
          currency: 'USD',
          previousAmounts: [],
          userAverageAmount: 0,
          userStandardDeviation: 0,
          merchantCategory: 'retail',
          isFirstTimeTransaction: true,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('under_reporting_threshold');
    });
  });

  describe('Micro to Large Transaction Detection', () => {
    it('should detect micro-transaction followed by large amount', async () => {
      const data: FraudAnalysisData = {
        amount: 500, // Large amount
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 500,
          currency: 'USD',
          previousAmounts: [5.99, 3.5], // Previous micro-transactions
          userAverageAmount: 4.75,
          userStandardDeviation: 1.25,
          merchantCategory: 'retail',
          isFirstTimeTransaction: false,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('micro_to_large_transaction');
    });
  });

  describe('Historical Average Exceedance Detection', () => {
    it('should detect amounts exceeding historical average by 3+ standard deviations', async () => {
      const data: FraudAnalysisData = {
        amount: 1000, // Much higher than average
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 1000,
          currency: 'USD',
          previousAmounts: [50, 60, 70, 80, 90], // Average ~70, std dev ~15
          userAverageAmount: 70,
          userStandardDeviation: 15, // 3 * 15 = 45, so 70 + 45 = 115 threshold
          merchantCategory: 'retail',
          isFirstTimeTransaction: false,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('exceeds_historical_average');
    });
  });

  describe('First Time High Value Transaction Detection', () => {
    it('should detect first-time transactions over $500', async () => {
      const data: FraudAnalysisData = {
        amount: 600, // Over $500
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 600,
          currency: 'USD',
          previousAmounts: [], // No previous transactions
          userAverageAmount: 0,
          userStandardDeviation: 0,
          merchantCategory: 'retail',
          isFirstTimeTransaction: true,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('first_time_high_value');
    });
  });

  describe('Merchant Category Consistency Detection', () => {
    it('should detect amounts inconsistent with merchant category', async () => {
      const data: FraudAnalysisData = {
        amount: 2000, // High for grocery
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 2000,
          currency: 'USD',
          previousAmounts: [],
          userAverageAmount: 0,
          userStandardDeviation: 0,
          merchantCategory: 'grocery', // Typical range: $10-$200
          isFirstTimeTransaction: true,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('inconsistent_merchant_category');
    });
  });

  describe('Maximum Credit Limit Detection', () => {
    it('should detect transactions at maximum credit limit', async () => {
      const data: FraudAnalysisData = {
        amount: 4950, // Within 1% of $5000 limit
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 4950,
          currency: 'USD',
          previousAmounts: [],
          userAverageAmount: 0,
          userStandardDeviation: 0,
          merchantCategory: 'retail',
          isFirstTimeTransaction: true,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('maximum_credit_limit');
    });
  });

  describe('Odd Cent Patterns Detection', () => {
    it('should detect suspicious cent patterns', async () => {
      const testCases = [
        { amount: 100.0, expected: true },
        { amount: 100.01, expected: true },
        { amount: 100.99, expected: true },
        { amount: 100.5, expected: false },
        { amount: 100.25, expected: false },
      ];

      for (const testCase of testCases) {
        const data: FraudAnalysisData = {
          amount: testCase.amount,
          currency: 'USD',
          email: 'test@example.com',
          domain: 'example.com',
          timestamp: new Date(),
        };

        const result = await fraudDetector.analyzeRisk(data);
        const hasOddCentRule = result.triggeredRules.includes('odd_cent_patterns');
        expect(hasOddCentRule).toBe(testCase.expected);
      }
    });
  });

  describe('Sequential Amount Testing Detection', () => {
    it('should detect sequential amount testing patterns', async () => {
      const data: FraudAnalysisData = {
        amount: 5.0, // Following sequential pattern
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 5.0,
          currency: 'USD',
          previousAmounts: [1.0, 2.0, 3.0, 4.0], // Sequential pattern
          userAverageAmount: 2.5,
          userStandardDeviation: 1.5,
          merchantCategory: 'retail',
          isFirstTimeTransaction: false,
          creditCardLimit: 5000,
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);
      expect(result.triggeredRules).toContain('sequential_amount_testing');
    });
  });

  describe('Combined Risk Scoring', () => {
    it('should accumulate risk scores from multiple rules', async () => {
      const data: FraudAnalysisData = {
        amount: 1000, // Round number
        currency: 'USD',
        email: 'test@example.com',
        domain: 'example.com',
        timestamp: new Date(),
        transactionAmount: {
          amount: 1000,
          currency: 'USD',
          previousAmounts: [5.0, 3.0], // Micro-transactions followed by large
          userAverageAmount: 4.0,
          userStandardDeviation: 1.0,
          merchantCategory: 'grocery', // Inconsistent with amount
          isFirstTimeTransaction: true, // First time high value
          creditCardLimit: 1000, // At credit limit
          reportingThreshold: 10000,
        },
      };

      const result = await fraudDetector.analyzeRisk(data);

      // Should trigger multiple rules
      expect(result.triggeredRules).toContain('round_number_amount');
      expect(result.triggeredRules).toContain('micro_to_large_transaction');
      expect(result.triggeredRules).toContain('first_time_high_value');
      expect(result.triggeredRules).toContain('inconsistent_merchant_category');
      expect(result.triggeredRules).toContain('maximum_credit_limit');

      // Risk score should be high due to multiple triggers
      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.isHighRisk).toBe(true);
    });
  });
});
