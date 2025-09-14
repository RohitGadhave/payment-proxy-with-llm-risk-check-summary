import {
  FraudDetector,
  FraudAnalysisData,
  FraudAnalysisResult,
  FraudConfig,
  FraudRule,
} from '../types/fraud';
import { envConfig } from '../config';
const config = envConfig.getConfig();
export class FraudDetectionService implements FraudDetector {
  private config: FraudConfig;

  constructor() {
    const fraudDetector: Partial<FraudConfig> = {
      threshold: config.FRAUD_THRESHOLD,
      largeAmountThreshold: config.LARGE_AMOUNT_THRESHOLD,
      suspiciousDomains: config.SUSPICIOUS_DOMAINS,
    };
    
    this.config = {
      threshold: 0.5,
      largeAmountThreshold: 5000,
      suspiciousDomains: ['.ru', '.test.com', '.example.com'],
      rules: this.getDefaultRules(),
      ...fraudDetector,
    };
  }

  async analyzeRisk(data: FraudAnalysisData): Promise<FraudAnalysisResult> {
    const triggeredRules: string[] = [];
    let totalScore = 0;

    // Apply each rule
    for (const rule of this.config.rules) {
      if (rule.condition(data)) {
        triggeredRules.push(rule.name);
        totalScore += rule.weight;
      }
    }

    // Normalize score to 0-1 range
    const riskScore = Math.min(totalScore, 1);
    const isHighRisk = riskScore >= this.config.threshold;
    return {
      riskScore,
      triggeredRules,
      explanation: '', // Will be filled by LLM service
      isHighRisk,
    };
  }

  getConfig(): FraudConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<FraudConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private getDefaultRules(): FraudRule[] {
    return [
      {
        name: 'large_amount',
        weight: 0.3,
        condition: data => data.amount > this.config.largeAmountThreshold,
        description: 'Transaction amount exceeds large amount threshold',
      },
      {
        name: 'suspicious_domain',
        weight: 0.4,
        condition: data => this.isSuspiciousDomain(data.domain),
        description: 'Email domain is flagged as suspicious',
      },
      {
        name: 'test_domain',
        weight: 0.2,
        condition: data => data.domain.includes('test') || data.domain.includes('example'),
        description: 'Email domain contains test or example keywords',
      },
      {
        name: 'high_value_currency',
        weight: 0.1,
        condition: data => data.currency === 'USD' && data.amount > 1000,
        description: 'High value transaction in USD',
      },
      {
        name: 'suspicious_email_pattern',
        weight: 0.2,
        condition: data => this.hasSuspiciousEmailPattern(data.email),
        description: 'Email address has suspicious patterns',
      },
    ];
  }

  private isSuspiciousDomain(domain: string): boolean {
    return this.config.suspiciousDomains.some(suspiciousDomain =>
      domain.toLowerCase().endsWith(suspiciousDomain.toLowerCase())
    );
  }

  private hasSuspiciousEmailPattern(email: string): boolean {
    const suspiciousPatterns = [
      /^\d+@/, // Email starts with numbers
      /@.*\d{4,}/, // Domain has 4+ consecutive digits
      /[^a-zA-Z0-9@._-]/, // Contains special characters
      /\.{2,}/, // Multiple consecutive dots
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  extractDomainFromEmail(email: string): string {
    const emailRegex = /^[^\s@]+@([^\s@]+)$/;
    const match = email.match(emailRegex);
    return match?.[1] ?? '';
  }
}
