import { v4 as uuidv4 } from 'uuid';
import { Transaction, TransactionLog, TransactionQuery } from '../types/transaction';

export class InMemoryTransactionLogger implements TransactionLog {
  private transactions: Transaction[] = [];

  addTransaction(transaction: Transaction): void {
    this.transactions.push(transaction);
  }

  getTransaction(id: string): Transaction | undefined {
    return this.transactions.find(t => t.id === id);
  }

  getAllTransactions(): Transaction[] {
    return [...this.transactions];
  }

  getTransactionsByEmail(email: string): Transaction[] {
    return this.transactions.filter(t => t.email.toLowerCase() === email.toLowerCase());
  }

  getTransactionsByStatus(status: string): Transaction[] {
    return this.transactions.filter(t => t.status === status);
  }

  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactions.filter(t => t.timestamp >= startDate && t.timestamp <= endDate);
  }

  clearTransactions(): void {
    this.transactions = [];
  }

  queryTransactions(query: TransactionQuery): Transaction[] {
    let filteredTransactions = [...this.transactions];

    if (query.email) {
      filteredTransactions = filteredTransactions.filter(t =>
        t.email.toLowerCase().includes(query.email?.toLowerCase() ?? '')
      );
    }

    if (query.status) {
      filteredTransactions = filteredTransactions.filter(t => t.status === query.status);
    }

    if (query.provider) {
      filteredTransactions = filteredTransactions.filter(t => t.provider === query.provider);
    }

    if (query.startDate) {
      filteredTransactions = filteredTransactions.filter(
        t => t.timestamp >= (query.startDate ?? new Date())
      );
    }

    if (query.endDate) {
      filteredTransactions = filteredTransactions.filter(
        t => t.timestamp <= (query.endDate ?? new Date())
      );
    }

    // Sort transactions
    if (query.sortBy) {
      filteredTransactions.sort((a, b) => {
        const sortBy = query.sortBy ?? 'timestamp';
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        switch (sortBy) {
          case 'timestamp':
            aValue = a.timestamp;
            bValue = b.timestamp;
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'riskScore':
            aValue = a.riskScore;
            bValue = b.riskScore;
            break;
          case 'email':
            aValue = a.email;
            bValue = b.email;
            break;
          default:
            aValue = a.timestamp;
            bValue = b.timestamp;
        }

        // Handle date comparison
        if (aValue instanceof Date && bValue instanceof Date) {
          const aTime = aValue.getTime();
          const bTime = bValue.getTime();
          if (aTime < bTime) return query.sortOrder === 'desc' ? 1 : -1;
          if (aTime > bTime) return query.sortOrder === 'desc' ? -1 : 1;
          return 0;
        }

        // Handle string/number comparison
        if (aValue < bValue) return query.sortOrder === 'desc' ? 1 : -1;
        if (aValue > bValue) return query.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    } else {
      // Default sort by timestamp descending
      filteredTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    // Pagination
    if (query.page && query.limit) {
      const startIndex = (query.page - 1) * query.limit;
      const endIndex = startIndex + query.limit;
      filteredTransactions = filteredTransactions.slice(startIndex, endIndex);
    }

    return filteredTransactions;
  }

  getTransactionStats(): {
    total: number;
    byStatus: Record<string, number>;
    byProvider: Record<string, number>;
    totalAmount: number;
    averageAmount: number;
  } {
    const stats = {
      total: this.transactions.length,
      byStatus: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      totalAmount: 0,
      averageAmount: 0,
    };

    this.transactions.forEach(transaction => {
      // Count by status
      stats.byStatus[transaction.status] = (stats.byStatus[transaction.status] || 0) + 1;

      // Count by provider
      stats.byProvider[transaction.provider] = (stats.byProvider[transaction.provider] || 0) + 1;

      // Sum amounts
      stats.totalAmount += transaction.amount;
    });

    stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

    return stats;
  }

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
  }): Transaction {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      ...data,
    };
  }
}
