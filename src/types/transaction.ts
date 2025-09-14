export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  email: string;
  source: string;
  provider: string;
  status: string;
  riskScore: number;
  explanation: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface TransactionLog {
  addTransaction(transaction: Transaction): void;
  getTransaction(id: string): Transaction | undefined;
  getAllTransactions(): Transaction[];
  getTransactionsByEmail(email: string): Transaction[];
  getTransactionsByStatus(status: string): Transaction[];
  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[];
  clearTransactions(): void;
  queryTransactions(query: TransactionQuery): Transaction[];
  getTransactionStats(): {
    total: number;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
    totalAmount: number;
    averageAmount: number;
  };
  createTransaction(data: {
    amount: number;
    currency: string;
    email: string;
    source: string;
    provider: string;
    status: string;
    riskScore: number;
    explanation: string;
    metadata?: Record<string, unknown>;
  }): Transaction;
}

export type SortableField = 'timestamp' | 'amount' | 'riskScore' | 'email';

export interface TransactionQuery {
  email?: string;
  status?: string;
  provider?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: SortableField;
  sortOrder?: 'asc' | 'desc';
}
