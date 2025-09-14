import { Router } from 'express';
import { PaymentController } from '../controllers/payment-controller';
import { PaymentRoutingService } from '../services/payment-processor.service';
import { InMemoryTransactionLogger } from '../services/transaction-logger.service';
import { FraudDetectionService } from '../services/fraud-detector.service';
import {
  validatePaymentRequest,
  validateTransactionQuery,
} from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';

const router = Router();

// Initialize services
const transactionLogger = new InMemoryTransactionLogger();
const paymentService = new PaymentRoutingService(transactionLogger);
const paymentController = new PaymentController(paymentService, transactionLogger);

// Payment routes
router.post('/charge', validatePaymentRequest, asyncHandler(paymentController.processPayment));

// Transaction routes
router.get(
  '/transactions',
  validateTransactionQuery,
  asyncHandler(paymentController.getTransactions)
);

router.get('/transactions/:id', asyncHandler(paymentController.getTransactionById));

router.get('/transactions/stats', asyncHandler(paymentController.getTransactionStats));

export default router;
