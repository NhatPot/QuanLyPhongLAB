import pino from 'pino';
import { ILogger } from '../../application/ports/ILogger';

export class PinoLogger implements ILogger {
  private logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production' ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        }
      } : undefined
    });
  }

  public info(message: string, context?: any): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  public error(message: string, error?: any, context?: any): void {
    const payload = {
      ...(context || {}),
      err: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    };
    this.logger.error(payload, message);
  }

  public warn(message: string, context?: any): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  public debug(message: string, context?: any): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }
}
