export interface FraudRule {
  name: string;
  weight: number;
  condition: (data: FraudAnalysisData) => boolean;
  description: string;
}

export interface TransactionAmountData {
  amount: number;
  currency: string;
  previousAmounts: number[];
  userAverageAmount: number;
  userStandardDeviation: number;
  merchantCategory: string;
  isFirstTimeTransaction: boolean;
  creditCardLimit?: number;
  reportingThreshold: number;
}

export interface FraudAnalysisData {
  amount: number;
  currency: string;
  email: string;
  domain: string;
  timestamp: Date;
  transactionAmount?: TransactionAmountData;
}

export interface FraudAnalysisResult {
  riskScore: number;
  triggeredRules: string[];
  explanation: string;
  isHighRisk: boolean;
}

export interface FraudConfig {
  threshold: number;
  largeAmountThreshold: number;
  suspiciousDomains: string[];
  rules: FraudRule[];
}

export interface FraudDetector {
  analyzeRisk(data: FraudAnalysisData): Promise<FraudAnalysisResult>;
  getConfig(): FraudConfig;
  updateConfig(config: Partial<FraudConfig>): void;
}
