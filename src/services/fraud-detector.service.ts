import {
  FraudDetector,
  FraudAnalysisData,
  FraudAnalysisResult,
  FraudConfig,
  FraudRule,
} from '../types/fraud';
import { envConfig } from '../config';
import { CacheService } from './cache.service';
const config = envConfig.getConfig();
export class FraudDetectionService implements FraudDetector {
  private config: FraudConfig;
  private cache: CacheService = new CacheService();

  constructor() {
    this.config = {
      threshold: config.FRAUD_THRESHOLD,
      largeAmountThreshold: config.LARGE_AMOUNT_THRESHOLD,
      suspiciousDomains: config.SUSPICIOUS_DOMAINS,
      rules: this.getDefaultRules(),
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
    const riskScore = +(Math.min(totalScore, 1).toFixed(2));
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
        condition: data => data.amount > 1000,
        description: 'High value transaction',
      },
      {
        name: 'suspicious_email_pattern',
        weight: 0.2,
        condition: data => this.hasSuspiciousEmailPattern(data.email),
        description: 'Email address has suspicious patterns',
      },
      {
        name: 'rapid_fire_transactions',
        weight: 0.3,
        condition: (data): boolean => {
          const cacheKey = this.generateCacheKey(data);
          const lastAttempt = +(this.cache.get(cacheKey) ?? 0);
          const now = Date.now();
          this.cache.set(cacheKey, now.toString());
            return lastAttempt ? now - lastAttempt < 45000 : false; // Less than 45 seconds since last
        },
        description: 'Multiple transactions in a short time frame',
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
      /@[^@+]+\+[^@]+\./, // Domain contains a plus sign (e.g., one+two@example.com)
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  extractDomainFromEmail(email: string): string {
    const emailRegex = /^[^\s@]+@([^\s@]+)$/;
    const match = email.match(emailRegex);
    return match?.[1] ?? '';
  }

  private generateCacheKey(data: FraudAnalysisData): string {
    return `${data.source}-${data.domain}`;
  }
}
