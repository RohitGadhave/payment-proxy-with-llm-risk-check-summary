import { FraudDetectionService } from '../../src/services/fraud-detector.service';
import { FraudAnalysisData } from '../../src/types/fraud';

describe('FraudDetectionService', () => {
  let fraudDetector: FraudDetectionService;

  beforeEach(() => {
    fraudDetector = new FraudDetectionService();
  });

  describe('analyzeRisk', () => {
    it('should return low risk for normal transaction', async () => {
      const data: FraudAnalysisData = {
        amount: 100,
        currency: 'USD',
        email: 'user@example.com',
        domain: 'example.com',
        timestamp: new Date(),
      };

      const result = await fraudDetector.analyzeRisk(data);

      expect(result.riskScore).toBeLessThan(0.5);
      expect(result.isHighRisk).toBe(false);
    });

    it('should detect large amount as high risk', async () => {
      const data: FraudAnalysisData = {
        amount: 10000,
        currency: 'USD',
        email: 'user@example.com',
        domain: 'example.com',
        timestamp: new Date(),
      };

      const result = await fraudDetector.analyzeRisk(data);

      expect(result.riskScore).toBeGreaterThan(0.3);
      expect(result.triggeredRules).toContain('large_amount');
    });

    it('should detect suspicious domain as high risk', async () => {
      const data: FraudAnalysisData = {
        amount: 100,
        currency: 'USD',
        email: 'user@test.ru',
        domain: 'test.ru',
        timestamp: new Date(),
      };

      const result = await fraudDetector.analyzeRisk(data);

      expect(result.riskScore).toBeGreaterThan(0.4);
      expect(result.triggeredRules).toContain('suspicious_domain');
    });

    it('should detect test domain as risk', async () => {
      const data: FraudAnalysisData = {
        amount: 100,
        currency: 'USD',
        email: 'user@test.com',
        domain: 'test.com',
        timestamp: new Date(),
      };

      const result = await fraudDetector.analyzeRisk(data);

      expect(result.triggeredRules).toContain('test_domain');
    });

    it('should detect suspicious email patterns', async () => {
      const data: FraudAnalysisData = {
        amount: 100,
        currency: 'USD',
        email: '12345@example.com',
        domain: 'example.com',
        timestamp: new Date(),
      };

      const result = await fraudDetector.analyzeRisk(data);

      expect(result.triggeredRules).toContain('suspicious_email_pattern');
    });

    it('should return high risk when multiple rules are triggered', async () => {
      const data: FraudAnalysisData = {
        amount: 10000,
        currency: 'USD',
        email: '12345@test.ru',
        domain: 'test.ru',
        timestamp: new Date(),
      };

      const result = await fraudDetector.analyzeRisk(data);

      expect(result.riskScore).toBeGreaterThan(0.5);
      expect(result.isHighRisk).toBe(true);
      expect(result.triggeredRules.length).toBeGreaterThan(1);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = fraudDetector.getConfig();

      expect(config).toHaveProperty('threshold');
      expect(config).toHaveProperty('largeAmountThreshold');
      expect(config).toHaveProperty('suspiciousDomains');
      expect(config).toHaveProperty('rules');
      expect(config.threshold).toBe(0.5);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        threshold: 0.7,
        largeAmountThreshold: 10000,
      };

      fraudDetector.updateConfig(newConfig);
      const config = fraudDetector.getConfig();

      expect(config.threshold).toBe(0.7);
      expect(config.largeAmountThreshold).toBe(10000);
    });
  });

  describe('extractDomainFromEmail', () => {
    it('should extract domain from valid email', () => {
      const domain = fraudDetector.extractDomainFromEmail('user@example.com');
      expect(domain).toBe('example.com');
    });

    it('should return empty string for invalid email', () => {
      const domain = fraudDetector.extractDomainFromEmail('invalid-email');
      expect(domain).toBe('');
    });
  });
});
