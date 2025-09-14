import { InMemoryTransactionLogger } from '../../src/services/transaction-logger';
import { Transaction } from '../../src/types/transaction';

describe('InMemoryTransactionLogger', () => {
  let logger: InMemoryTransactionLogger;

  beforeEach(() => {
    logger = new InMemoryTransactionLogger();
  });

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
  });

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

      // Manually set timestamp to yesterday
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
  });

  describe('queryTransactions', () => {
    beforeEach(() => {
      // Add test transactions
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
      const results = logger.queryTransactions({
        sortBy: 'amount',
        sortOrder: 'asc',
      });
      expect(results[0]?.amount).toBeLessThanOrEqual(results[1]?.amount ?? 0);
    });
  });

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
  });

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
});
