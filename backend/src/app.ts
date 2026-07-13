import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createHealthRouter } from './presentation/http/routes/health.routes';
import { authRouter } from './presentation/http/routes/auth.routes';
import { createLabRouter } from './presentation/http/routes/lab.routes';
import { createComputerRouter } from './presentation/http/routes/computer.routes';
import { createEquipmentRouter } from './presentation/http/routes/equipment.routes';
import { createBookingRouter } from './presentation/http/routes/booking.routes';
import { createAvailabilityRouter } from './presentation/http/routes/availability.routes';
import { container } from './container/dependency-container';
import { correlationIdMiddleware } from './presentation/http/middlewares/correlationIdMiddleware';
import { errorHandlerMiddleware } from './presentation/http/middlewares/errorHandlerMiddleware';
import { ApiResponse } from './presentation/http/presenters/ApiResponse';

dotenv.config();

export function createExpressApp(): Express {
  const app = express();

  // Basic Middlewares
  app.use(correlationIdMiddleware);
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request logger middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      container.logger.info(
        `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`,
        {
          correlationId: req.correlationId,
          method: req.method,
          path: req.url,
          statusCode: res.statusCode,
          duration
        }
      );
    });
    next();
  });

  // API Routes
  app.use('/api', createHealthRouter(container.healthController));
  app.use('/api/auth', authRouter);
  app.use('/api/lab-profile', createLabRouter(container.labController));
  app.use('/api/computers', createComputerRouter(container.computerController));
  app.use('/api/equipments', createEquipmentRouter(container.equipmentController));
  app.use('/api/bookings', createBookingRouter());
  app.use('/api/availability', createAvailabilityRouter());  // 404 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json(
      ApiResponse.error("RESOURCE_NOT_FOUND", `Không tìm thấy tài nguyên: ${req.method} ${req.url}`, null, req.correlationId)
    );
  });

  // Global error handler
  app.use(errorHandlerMiddleware);

  return app;
}

