import { InMemoryTransactionLogger } from '../../src/services/transaction-logger.service';
import { Transaction } from '../../src/types/transaction';

describe('InMemoryTransactionLogger', () => {
  let logger: InMemoryTransactionLogger;

  beforeEach(() => {
    logger = new InMemoryTransactionLogger();
  });

  // -------------------------
  // Add and get transaction
  // -------------------------
  describe('addTransaction and getTransaction', () => {
    it('should add and retrieve transaction', () => {
      const transaction: Transaction = {
        id: 'test-id',
        amount: 100,
        currency: 'USD',
        email: 'test@example.com',
        source: 'tok_test',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test explanation',
        timestamp: new Date(),
      };

      logger.addTransaction(transaction);
      const retrieved = logger.getTransaction('test-id');

      expect(retrieved).toEqual(transaction);
    });

    it('should return undefined for non-existent transaction', () => {
      const retrieved = logger.getTransaction('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  // -------------------------
  // Get all transactions
  // -------------------------
  describe('getAllTransactions', () => {
    it('should return all transactions', () => {
      const transaction1 = logger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'test1@example.com',
        source: 'tok_test1',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test 1',
      });

      const transaction2 = logger.createTransaction({
        amount: 200,
        currency: 'USD',
        email: 'test2@example.com',
        source: 'tok_test2',
        provider: 'paypal',
        status: 'success',
        riskScore: 0.3,
        explanation: 'Test 2',
      });

      logger.addTransaction(transaction1);
      logger.addTransaction(transaction2);

      const allTransactions = logger.getAllTransactions();
      expect(allTransactions).toHaveLength(2);
      expect(allTransactions).toContain(transaction1);
      expect(allTransactions).toContain(transaction2);
    });
  });

  // -------------------------
  // Get transactions by email
  // -------------------------
  describe('getTransactionsByEmail', () => {
    it('should filter transactions by email', () => {
      const transaction1 = logger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'test1@example.com',
        source: 'tok_test1',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test 1',
      });

      const transaction2 = logger.createTransaction({
        amount: 200,
        currency: 'USD',
        email: 'test2@example.com',
        source: 'tok_test2',
        provider: 'paypal',
        status: 'success',
        riskScore: 0.3,
        explanation: 'Test 2',
      });

      logger.addTransaction(transaction1);
      logger.addTransaction(transaction2);

      const filtered = logger.getTransactionsByEmail('test1@example.com');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(transaction1);
    });

    it('should be case insensitive', () => {
      const transaction = logger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'Test@Example.com',
        source: 'tok_test',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test',
      });

      logger.addTransaction(transaction);
      const filtered = logger.getTransactionsByEmail('test@example.com');
      expect(filtered).toHaveLength(1);
    });

    it('should return empty array for unknown email', () => {
      const results = logger.getTransactionsByEmail('unknown@example.com');
      expect(results).toHaveLength(0);
    });

    it('should return all transactions if email is empty string', () => {
      const transaction = logger.createTransaction({
        amount: 10,
        currency: 'USD',
        email: '',
        source: 'tok_test',
        provider: 'stripe',
        status: 'success',
        riskScore: 0,
        explanation: 'Empty email',
      });
      logger.addTransaction(transaction);
      const results = logger.getTransactionsByEmail('');
      expect(results).toHaveLength(1);
    });
  });

  // -------------------------
  // Get transactions by status
  // -------------------------
  describe('getTransactionsByStatus', () => {
    it('should filter transactions by status', () => {
      const transaction1 = logger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'test1@example.com',
        source: 'tok_test1',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test 1',
      });

      const transaction2 = logger.createTransaction({
        amount: 200,
        currency: 'USD',
        email: 'test2@example.com',
        source: 'tok_test2',
        provider: 'paypal',
        status: 'blocked',
        riskScore: 0.8,
        explanation: 'Test 2',
      });

      logger.addTransaction(transaction1);
      logger.addTransaction(transaction2);

      const successTransactions = logger.getTransactionsByStatus('success');
      const blockedTransactions = logger.getTransactionsByStatus('blocked');

      expect(successTransactions).toHaveLength(1);
      expect(blockedTransactions).toHaveLength(1);
      expect(successTransactions[0]).toEqual(transaction1);
      expect(blockedTransactions[0]).toEqual(transaction2);
    });
  });

  // -------------------------
  // Get transactions by date range
  // -------------------------
  describe('getTransactionsByDateRange', () => {
    it('should filter transactions by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const transaction1 = logger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'test1@example.com',
        source: 'tok_test1',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test 1',
      });
      transaction1.timestamp = yesterday;

      const transaction2 = logger.createTransaction({
        amount: 200,
        currency: 'USD',
        email: 'test2@example.com',
        source: 'tok_test2',
        provider: 'paypal',
        status: 'success',
        riskScore: 0.3,
        explanation: 'Test 2',
      });

      logger.addTransaction(transaction1);
      logger.addTransaction(transaction2);

      const filtered = logger.getTransactionsByDateRange(yesterday, tomorrow);
      expect(filtered).toHaveLength(2);
    });

    it('should return empty array if no transactions in range', () => {
      const start = new Date('2000-01-01');
      const end = new Date('2000-01-02');
      const results = logger.getTransactionsByDateRange(start, end);
      expect(results).toHaveLength(0);
    });

    it('should return empty array if startDate > endDate', () => {
      const start = new Date('2025-01-02');
      const end = new Date('2025-01-01');
      const results = logger.getTransactionsByDateRange(start, end);
      expect(results).toHaveLength(0);
    });
  });

  // -------------------------
  // Query transactions
  // -------------------------
  describe('queryTransactions', () => {
    beforeEach(() => {
      const transactions = [
        {
          amount: 100,
          currency: 'USD',
          email: 'test1@example.com',
          source: 'tok_test1',
          provider: 'stripe',
          status: 'success',
          riskScore: 0.2,
          explanation: 'Test 1',
        },
        {
          amount: 200,
          currency: 'USD',
          email: 'test2@example.com',
          source: 'tok_test2',
          provider: 'paypal',
          status: 'blocked',
          riskScore: 0.8,
          explanation: 'Test 2',
        },
        {
          amount: 300,
          currency: 'EUR',
          email: 'test3@example.com',
          source: 'tok_test3',
          provider: 'stripe',
          status: 'success',
          riskScore: 0.3,
          explanation: 'Test 3',
        },
      ];

      transactions.forEach(tx => {
        const transaction = logger.createTransaction(tx);
        logger.addTransaction(transaction);
      });
    });

    it('should filter by email', () => {
      const results = logger.queryTransactions({ email: 'test1@example.com' });
      expect(results).toHaveLength(1);
      expect(results[0]?.email).toBe('test1@example.com');
    });

    it('should filter by status', () => {
      const results = logger.queryTransactions({ status: 'blocked' });
      expect(results).toHaveLength(1);
      expect(results[0]?.status).toBe('blocked');
    });

    it('should filter by provider', () => {
      const results = logger.queryTransactions({ provider: 'stripe' });
      expect(results).toHaveLength(2);
    });

    it('should support pagination', () => {
      const results = logger.queryTransactions({ page: 1, limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should sort by amount ascending', () => {
      const results = logger.queryTransactions({ sortBy: 'amount', sortOrder: 'asc' });
      expect(results[0]?.amount).toBeLessThanOrEqual(results[1]?.amount ?? 0);
    });

    it('should sort by riskScore descending', () => {
      const results = logger.queryTransactions({ sortBy: 'riskScore', sortOrder: 'desc' });
      expect(results[0].riskScore).toBeGreaterThanOrEqual(results[1].riskScore);
    });

    it('should sort by email ascending', () => {
      const results = logger.queryTransactions({ sortBy: 'email', sortOrder: 'asc' });
      expect(results[0].email <= results[1].email).toBe(true);
    });

    it('should filter by startDate and endDate', () => {
      const now = new Date();
      const start = new Date(now.getTime() - 1000);
      const end = new Date(now.getTime() + 1000);
      const results = logger.queryTransactions({ startDate: start, endDate: end });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array if no matches', () => {
      const results = logger.queryTransactions({ email: 'nomatch@example.com' });
      expect(results).toHaveLength(0);
    });
  });

  // -------------------------
  // getTransactionStats
  // -------------------------
  describe('getTransactionStats', () => {
    it('should return correct statistics', () => {
      const transactions = [
        {
          amount: 100,
          currency: 'USD',
          email: 'test1@example.com',
          source: 'tok_test1',
          provider: 'stripe',
          status: 'success',
          riskScore: 0.2,
          explanation: 'Test 1',
        },
        {
          amount: 200,
          currency: 'USD',
          email: 'test2@example.com',
          source: 'tok_test2',
          provider: 'paypal',
          status: 'blocked',
          riskScore: 0.8,
          explanation: 'Test 2',
        },
      ];

      transactions.forEach(tx => {
        const transaction = logger.createTransaction(tx);
        logger.addTransaction(transaction);
      });

      const stats = logger.getTransactionStats();

      expect(stats.total).toBe(2);
      expect(stats.byStatus.success).toBe(1);
      expect(stats.byStatus.blocked).toBe(1);
      expect(stats.byProvider.stripe).toBe(1);
      expect(stats.byProvider.paypal).toBe(1);
      expect(stats.totalAmount).toBe(300);
      expect(stats.averageAmount).toBe(150);
    });

    it('should return zeros when no transactions', () => {
      const stats = logger.getTransactionStats();
      expect(stats.total).toBe(0);
      expect(stats.totalAmount).toBe(0);
      expect(stats.averageAmount).toBe(0);
      expect(stats.byStatus).toEqual({});
      expect(stats.byProvider).toEqual({});
    });
  });

  // -------------------------
  // clearTransactions
  // -------------------------
  describe('clearTransactions', () => {
    it('should clear all transactions', () => {
      const transaction = logger.createTransaction({
        amount: 100,
        currency: 'USD',
        email: 'test@example.com',
        source: 'tok_test',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.2,
        explanation: 'Test',
      });

      logger.addTransaction(transaction);
      expect(logger.getAllTransactions()).toHaveLength(1);

      logger.clearTransactions();
      expect(logger.getAllTransactions()).toHaveLength(0);
    });
  });

  // -------------------------
  // createTransaction
  // -------------------------
  describe('createTransaction', () => {
    it('should create transaction with id and timestamp', () => {
      const data = {
        amount: 50,
        currency: 'USD',
        email: 'user@example.com',
        source: 'tok_123',
        provider: 'stripe',
        status: 'success',
        riskScore: 0.1,
        explanation: 'Test creation',
        metadata: { key: 'value' },
      };

      const tx = logger.createTransaction(data);
      expect(tx.id).toBeDefined();
      expect(tx.timestamp).toBeInstanceOf(Date);
      expect(tx.metadata).toEqual({ key: 'value' });
    });
  });
});
