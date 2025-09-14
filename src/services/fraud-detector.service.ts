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
      // Original rules
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

      // Transaction Amount Analysis Rules
      {
        name: 'round_number_amount',
        weight: 0.15,
        condition: data => this.isRoundNumberAmount(data.amount),
        description: 'Transaction amount is a round number (suspicious pattern)',
      },
      {
        name: 'gradual_amount_increase',
        weight: 0.25,
        condition: data => this.hasGradualAmountIncrease(data),
        description: 'Multiple transactions with gradual amount increases (testing limits)',
      },
      {
        name: 'under_reporting_threshold',
        weight: 0.3,
        condition: data => this.isUnderReportingThreshold(data),
        description: 'Amount just under reporting threshold (suspicious)',
      },
      {
        name: 'micro_to_large_transaction',
        weight: 0.2,
        condition: data => this.isMicroTransactionFollowedByLarge(data),
        description: 'Micro-transaction followed by large amount',
      },
      {
        name: 'exceeds_historical_average',
        weight: 0.35,
        condition: data => this.exceedsHistoricalAverage(data),
        description: 'Amount exceeds user historical average by 3+ standard deviations',
      },
      {
        name: 'first_time_high_value',
        weight: 0.25,
        condition: data => this.isFirstTimeHighValueTransaction(data),
        description: 'First-time transaction over $500',
      },
      {
        name: 'inconsistent_merchant_category',
        weight: 0.2,
        condition: data => this.isInconsistentWithMerchantCategory(data),
        description: 'Amount inconsistent with merchant category',
      },
      {
        name: 'maximum_credit_limit',
        weight: 0.4,
        condition: data => this.isMaximumCreditLimitTransaction(data),
        description: 'Transaction at maximum credit card limit',
      },
      {
        name: 'odd_cent_patterns',
        weight: 0.1,
        condition: data => this.hasOddCentPatterns(data.amount),
        description: 'Odd cent amounts (.00, .01, .99 patterns)',
      },
      {
        name: 'sequential_amount_testing',
        weight: 0.3,
        condition: data => this.hasSequentialAmountTesting(data),
        description: 'Sequential amount testing patterns detected',
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

  // Transaction Amount Analysis Methods

  private isRoundNumberAmount(amount: number): boolean {
    // Check for common round numbers that are suspicious
    const roundNumbers = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
    return roundNumbers.includes(amount);
  }

  private hasGradualAmountIncrease(data: FraudAnalysisData): boolean {
    if (
      !data.transactionAmount?.previousAmounts ||
      data.transactionAmount.previousAmounts.length < 3
    ) {
      return false;
    }

    const amounts = data.transactionAmount.previousAmounts.slice(-5); // Last 5 transactions
    const currentAmount = data.amount;

    // Check if amounts are gradually increasing
    let increasingCount = 0;
    for (let i = 1; i < amounts.length; i++) {
      const current = amounts[i];
      const previous = amounts[i - 1];
      if (current !== undefined && previous !== undefined && current > previous) {
        increasingCount++;
      }
    }

    // If 3+ consecutive increases and current amount is higher than last
    const lastAmount = amounts[amounts.length - 1];
    return increasingCount >= 3 && lastAmount !== undefined && currentAmount > lastAmount;
  }

  private isUnderReportingThreshold(data: FraudAnalysisData): boolean {
    const reportingThreshold = data.transactionAmount?.reportingThreshold || 10000;
    const amount = data.amount;

    // Check if amount is within 1% of reporting threshold
    const thresholdBuffer = reportingThreshold * 0.01;
    return amount >= reportingThreshold - thresholdBuffer && amount < reportingThreshold;
  }

  private isMicroTransactionFollowedByLarge(data: FraudAnalysisData): boolean {
    if (
      !data.transactionAmount?.previousAmounts ||
      data.transactionAmount.previousAmounts.length < 2
    ) {
      return false;
    }

    const lastAmount =
      data.transactionAmount.previousAmounts[data.transactionAmount.previousAmounts.length - 1];
    const currentAmount = data.amount;

    // Micro-transaction is typically under $10, large is over $100
    return lastAmount !== undefined && lastAmount < 10 && currentAmount > 100;
  }

  private exceedsHistoricalAverage(data: FraudAnalysisData): boolean {
    if (!data.transactionAmount) {
      return false;
    }

    const { userAverageAmount, userStandardDeviation } = data.transactionAmount;
    const currentAmount = data.amount;

    // Check if current amount exceeds average by 3+ standard deviations
    const threshold = userAverageAmount + 3 * userStandardDeviation;
    return currentAmount > threshold;
  }

  private isFirstTimeHighValueTransaction(data: FraudAnalysisData): boolean {
    if (!data.transactionAmount) {
      return false;
    }

    const { isFirstTimeTransaction } = data.transactionAmount;
    const currentAmount = data.amount;

    return isFirstTimeTransaction && currentAmount > 500;
  }

  private isInconsistentWithMerchantCategory(data: FraudAnalysisData): boolean {
    if (!data.transactionAmount) {
      return false;
    }

    const { merchantCategory } = data.transactionAmount;
    const currentAmount = data.amount;

    // Define typical amount ranges for different merchant categories
    const categoryRanges: Record<string, { min: number; max: number }> = {
      grocery: { min: 10, max: 200 },
      gas: { min: 20, max: 100 },
      restaurant: { min: 5, max: 150 },
      retail: { min: 10, max: 1000 },
      electronics: { min: 50, max: 5000 },
      jewelry: { min: 100, max: 10000 },
      travel: { min: 100, max: 5000 },
      utilities: { min: 20, max: 500 },
      subscription: { min: 5, max: 100 },
      digital_goods: { min: 1, max: 200 },
    };

    const range = categoryRanges[merchantCategory.toLowerCase()];
    if (!range) {
      return false;
    }

    return currentAmount < range.min || currentAmount > range.max;
  }

  private isMaximumCreditLimitTransaction(data: FraudAnalysisData): boolean {
    if (!data.transactionAmount?.creditCardLimit) {
      return false;
    }

    const { creditCardLimit } = data.transactionAmount;
    const currentAmount = data.amount;

    // Check if amount is within 1% of credit limit
    const threshold = creditCardLimit * 0.99;
    return currentAmount >= threshold;
  }

  private hasOddCentPatterns(amount: number): boolean {
    const cents = Math.round((amount % 1) * 100);

    // Check for suspicious cent patterns
    const suspiciousCents = [0, 1, 99]; // .00, .01, .99
    return suspiciousCents.includes(cents);
  }

  private hasSequentialAmountTesting(data: FraudAnalysisData): boolean {
    if (
      !data.transactionAmount?.previousAmounts ||
      data.transactionAmount.previousAmounts.length < 3
    ) {
      return false;
    }

    const amounts = data.transactionAmount.previousAmounts.slice(-5); // Last 5 transactions
    const currentAmount = data.amount;

    // Check for sequential testing patterns (e.g., 1.00, 2.00, 3.00, 4.00, 5.00)
    let sequentialCount = 0;
    for (let i = 1; i < amounts.length; i++) {
      const current = amounts[i];
      const previous = amounts[i - 1];
      if (current !== undefined && previous !== undefined) {
        const diff = Math.abs(current - previous);
        if (diff <= 1.0) {
          // Within $1 of previous amount
          sequentialCount++;
        }
      }
    }

    // Check if current amount follows the pattern
    const lastAmount = amounts[amounts.length - 1];
    const currentDiff = lastAmount !== undefined ? Math.abs(currentAmount - lastAmount) : Infinity;

    return sequentialCount >= 2 && currentDiff <= 1.0;
  }
}
