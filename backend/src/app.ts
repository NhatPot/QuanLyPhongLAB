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
import { createUserRouter } from './presentation/http/routes/user.routes';
import { createRoleRouter } from './presentation/http/routes/role.routes';
import { createAuditLogRouter } from './presentation/http/routes/audit-log.routes';
import { createMaintenanceRouter } from './presentation/http/routes/maintenance.routes';
import { createIncidentRouter } from './presentation/http/routes/incident.routes';
import { createExpenseRouter } from './presentation/http/routes/expense.routes';
import { createDeviceRouter } from './presentation/http/routes/device.routes';
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
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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
  app.use('/api/availability', createAvailabilityRouter());
  app.use('/api/users', createUserRouter(container.userController));
  app.use('/api/roles', createRoleRouter(container.roleController));
  app.use('/api/audit-logs', createAuditLogRouter(container.auditLogController));
  app.use('/api/audit-log', createAuditLogRouter(container.auditLogController));
  app.use('/api/maintenances', createMaintenanceRouter(container.maintenanceController));
  app.use('/api/incidents', createIncidentRouter(container.incidentController));
  app.use('/api/expenses', createExpenseRouter(container.expenseController));
  app.use('/api/devices', createDeviceRouter(container.deviceController, container.deviceAgentRepo));
  // 404 handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json(
      ApiResponse.error("RESOURCE_NOT_FOUND", `Không tìm thấy tài nguyên: ${req.method} ${req.url}`, null, req.correlationId)
    );
  });

  // Global error handler
  app.use(errorHandlerMiddleware);

  return app;
}
