import { Request, Response } from 'express';
import { PaymentRequest, PaymentResponse } from '../types/payment';
import { ApiResponse } from '../types/api';
import { TransactionQuery } from '../types/transaction';
import { PaymentRoutingService } from '../services/payment-processor.service';
import { InMemoryTransactionLogger } from '../services/transaction-logger.service';
import { AppError } from '../middleware/error-handler.middleware';

export class PaymentController {
  constructor(
    private paymentService: PaymentRoutingService,
    private transactionLogger: InMemoryTransactionLogger
  ) {}

  processPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const paymentRequest: PaymentRequest = req.body;

      const result = await this.paymentService.processPayment(paymentRequest);

      const response: ApiResponse<PaymentResponse> = {
        success: true,
        data: result,
        message: 'Payment processed successfully',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      throw new AppError('Failed to process payment', 500, true, {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: TransactionQuery = req.query as TransactionQuery;

      const transactions = this.transactionLogger.queryTransactions(query);
      const stats = this.transactionLogger.getTransactionStats();

      const response: ApiResponse<{
        transactions: typeof transactions;
        stats: typeof stats;
        pagination?:
          | {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            }
          | undefined;
      }> = {
        success: true,
        data: {
          transactions,
          stats,
          pagination:
            query.page && query.limit
              ? {
                  page: query.page,
                  limit: query.limit,
                  total: this.transactionLogger.getAllTransactions().length,
                  totalPages: Math.ceil(
                    this.transactionLogger.getAllTransactions().length / query.limit
                  ),
                }
              : undefined,
        },
        message: 'Transactions retrieved successfully',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      throw new AppError('Failed to retrieve transactions', 500, true, {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  getTransactionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new AppError('Transaction ID is required', 400, true);
      }

      const transaction = this.transactionLogger.getTransaction(id);

      if (!transaction) {
        throw new AppError('Transaction not found', 404, true);
      }

      const response: ApiResponse<typeof transaction> = {
        success: true,
        data: transaction,
        message: 'Transaction retrieved successfully',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to retrieve transaction', 500, true, {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  getTransactionStats = async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.transactionLogger.getTransactionStats();

      const response: ApiResponse<typeof stats> = {
        success: true,
        data: stats,
        message: 'Transaction statistics retrieved successfully',
        timestamp: new Date(),
      };

      res.status(200).json(response);
    } catch (error) {
      throw new AppError('Failed to retrieve transaction statistics', 500, true, {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
