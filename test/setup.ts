// Test setup file
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.PORT = '3001';
process.env.FRAUD_THRESHOLD = '0.5';
process.env.LARGE_AMOUNT_THRESHOLD = '5000';
process.env.SUSPICIOUS_DOMAINS = '.ru,.test.com,.example.com';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.LOG_LEVEL = 'error';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for tests that might take longer
jest.setTimeout(10000);
