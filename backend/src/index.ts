import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server';
import { startScheduler } from './scheduler/pm';
import { logger } from './utils/logger';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const port = Number(process.env.PORT || 4000);
const app = createServer();

app.listen(port, () => {
  startScheduler();
  logger.info(`🚀 API server started on port ${port}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📝 Logs directory: ${logsDir}`);
  console.log(`✅ API running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
