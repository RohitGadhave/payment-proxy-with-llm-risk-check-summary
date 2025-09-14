import {
  PaymentRequest,
  PaymentResponse,
  PaymentProcessor,
  PaymentProvider,
  PaymentStatus,
} from '../types/payment';
import { FraudAnalysisData, FraudAnalysisResult, TransactionAmountData } from '../types/fraud';
import { FraudDetectionService } from './fraud-detector.service';
import { OpenAIService } from './llm.service';
import { InMemoryTransactionLogger } from './transaction-logger.service';

export class PaymentRoutingService implements PaymentProcessor {
  private llmService: OpenAIService;
  private fraudDetector: FraudDetectionService = new FraudDetectionService();
  constructor(private transactionLogger: InMemoryTransactionLogger) {
    this.llmService = new OpenAIService();
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Extract domain from email
    const domain = this.extractDomainFromEmail(request.email);

    // Prepare fraud analysis data with transaction amount analysis
    const fraudData: FraudAnalysisData = {
      amount: request.amount,
      currency: request.currency,
      email: request.email,
      domain,
      timestamp: new Date(),
      transactionAmount: await this.enrichTransactionAmountData(request),
    };

    // Analyze fraud risk
    const fraudResult = await this.fraudDetector.analyzeRisk(fraudData);

    // Determine provider and status based on risk score
    const { provider, status } = this.determineRouting(fraudResult);

    // Generate explanation using LLM
    const explanation = await this.llmService.generateExplanation(
      fraudData,
      fraudResult,
      provider,
      status
    );

    // Create transaction record
    const transaction = this.transactionLogger.createTransaction({
      amount: request.amount,
      currency: request.currency,
      email: request.email,
      source: request.source,
      provider,
      status,
      riskScore: fraudResult.riskScore,
      explanation,
      metadata: {
        triggeredRules: fraudResult.triggeredRules,
        isHighRisk: fraudResult.isHighRisk,
      },
    });

    // Log the transaction
    this.transactionLogger.addTransaction(transaction);

    // Return response
    return {
      transactionId: transaction.id,
      provider: provider as PaymentProvider,
      status: status as PaymentStatus,
      riskScore: fraudResult.riskScore,
      explanation,
      timestamp: transaction.timestamp,
    };
  }

  private determineRouting(result: FraudAnalysisResult): { provider: string; status: string } {
    if (result.isHighRisk) {
      return {
        provider: 'blocked',
        status: 'blocked',
      };
    }

    // Route to different providers based on risk score
    if (result.riskScore < 0.2) {
      return {
        provider: 'stripe',
        status: 'success',
      };
    } else if (result.riskScore < 0.4) {
      return {
        provider: 'paypal',
        status: 'success',
      };
    } else {
      return {
        provider: 'stripe',
        status: 'success',
      };
    }
  }

  private extractDomainFromEmail(email: string): string {
    const emailRegex = /^[^\s@]+@([^\s@]+)$/;
    const match = email.match(emailRegex);
    return match?.[1] ?? '';
  }

  private async enrichTransactionAmountData(
    request: PaymentRequest
  ): Promise<TransactionAmountData> {
    // In a real implementation, this would fetch user transaction history from a database
    // For now, we'll simulate some data based on the request

    const userEmail = request.email;
    const currentAmount = request.amount;

    // Simulate user transaction history (in production, fetch from database)
    const previousAmounts = await this.getUserTransactionHistory(userEmail);

    // Calculate user statistics
    const userAverageAmount = this.calculateAverage(previousAmounts);
    const userStandardDeviation = this.calculateStandardDeviation(
      previousAmounts,
      userAverageAmount
    );

    // Determine if this is a first-time transaction
    const isFirstTimeTransaction = previousAmounts.length === 0;

    // Get merchant category (in production, this would come from merchant data)
    const merchantCategory = this.getMerchantCategory();

    // Get credit card limit (in production, this would come from payment method data)
    const creditCardLimit = await this.getCreditCardLimit();

    // Set reporting threshold based on jurisdiction (in production, this would be configurable)
    const reportingThreshold = this.getReportingThreshold(request.currency);

    return {
      amount: currentAmount,
      currency: request.currency,
      previousAmounts,
      userAverageAmount,
      userStandardDeviation,
      merchantCategory,
      isFirstTimeTransaction,
      creditCardLimit: creditCardLimit || 0,
      reportingThreshold,
    };
  }

  private async getUserTransactionHistory(email: string): Promise<number[]> {
    // In production, this would query the transaction database
    // For simulation, return some sample data
    const transactions = this.transactionLogger.getTransactionsByEmail(email);
    return transactions.map(t => t.amount);
  }

  private calculateAverage(amounts: number[]): number {
    if (amounts.length === 0) return 0;
    return amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  }

  private calculateStandardDeviation(amounts: number[], average: number): number {
    if (amounts.length === 0) return 0;
    const variance =
      amounts.reduce((sum, amount) => sum + Math.pow(amount - average, 2), 0) / amounts.length;
    return Math.sqrt(variance);
  }

  private getMerchantCategory(): string {
    // In production, this would be determined by merchant data or request metadata
    // For now, return a default category
    return 'retail';
  }

  private async getCreditCardLimit(): Promise<number | undefined> {
    // In production, this would query payment method data
    // For simulation, return a default limit
    return 5000;
  }

  private getReportingThreshold(currency: string): number {
    // Different reporting thresholds for different currencies
    const thresholds: Record<string, number> = {
      USD: 10000,
      EUR: 10000,
      GBP: 10000,
      CAD: 10000,
      AUD: 10000,
    };
    return thresholds[currency] || 10000;
  }
}
