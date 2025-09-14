import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import indexRoutes from './routes/index.routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
import { validateContentType } from './middleware/validation.middleware';
import { envConfig } from './config';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: envConfig.isProduction()
      ? envConfig.getConfig().ALLOWED_ORIGINS?.length
        ? envConfig.getConfig().ALLOWED_ORIGINS
        : ['http://localhost:3000']
      : true,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: envConfig.getConfig().RATE_LIMIT_WINDOW_MS,
  max: envConfig.getConfig().RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Content type validation
app.use(validateContentType);

// Request logging middleware
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// API routes
app.use('/api', indexRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Payment Routing API',
    version: '1.0.0',
    timestamp: new Date(),
    endpoints: {
      'POST /api/paymentcharge': 'Process a payment with fraud detection',
      'GET /api/paymentcharge/transactions': 'Get all transactions with optional filtering',
      'GET /api/paymentcharge/transactions/:id': 'Get a specific transaction by ID',
      'GET /api/paymentcharge/transactions/stats': 'Get transaction statistics',
      'GET /api/monitor/health': 'Health check endpoint',
    },
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;
