import { createExpressApp } from './app';
import { container } from './container/dependency-container';

const app = createExpressApp();
const port = process.env.PORT || 5000;

const server = app.listen(port, () => {
  container.logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode.`);
});

// Graceful Shutdown
const shutdown = (signal: string) => {
  container.logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    container.logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Timeout for force shutdown
  setTimeout(() => {
    container.logger.warn('Forcing shutdown due to timeout...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
