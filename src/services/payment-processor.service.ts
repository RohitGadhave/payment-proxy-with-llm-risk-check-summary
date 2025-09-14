import {
  PaymentRequest,
  PaymentResponse,
  PaymentProcessor,
  PaymentProvider,
  PaymentStatus,
} from '../types/payment';
import { FraudAnalysisData, FraudAnalysisResult } from '../types/fraud';
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

    // Prepare fraud analysis data
    const fraudData: FraudAnalysisData = {
      amount: request.amount,
      currency: request.currency,
      email: request.email,
      domain,
      timestamp: new Date(),
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
}
