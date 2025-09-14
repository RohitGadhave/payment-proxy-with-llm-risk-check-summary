export interface PaymentRequest {
  amount: number;
  currency: string;
  source: string;
  email: string;
}

export interface PaymentResponse {
  transactionId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  riskScore: number;
  explanation: string;
  timestamp: Date;
}

export type PaymentProvider = 'stripe' | 'paypal' | 'blocked';

export type PaymentStatus = 'success' | 'failed' | 'blocked';

export interface PaymentProcessor {
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: string[];
}
