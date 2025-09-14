import app from './app';
import { envConfig } from './config';

const config = envConfig.getConfig();

// Start server
const server = app.listen(config.PORT, () => {
  console.log(`🚀 Payment Routing API Server`);
  console.log(`📍 Environment: ${config.NODE_ENV}`);
  console.log(`🌐 Port: ${config.PORT}`);
  console.log(`🔗 URL: http://localhost:${config.PORT}`);
  console.log(`📚 API Documentation: http://localhost:${config.PORT}/`);
  console.log(`💚 Health Check: http://localhost:${config.PORT}/api/monitor/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;
