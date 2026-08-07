import { Router } from 'express';
import { AvailabilityController } from '../controllers/AvailabilityController';
import { CheckAvailabilityUseCase } from '../../../application/use-cases/booking/CheckAvailabilityUseCase';
import { SqlLabProfileRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlLabProfileRepository';
import { SqlComputerRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlComputerRepository';
import { SqlEquipmentRepository } from '../../../infrastructure/database/sqlserver/repositories/SqlEquipmentRepository';
import { SqlAvailabilityQueryService } from '../../../infrastructure/database/sqlserver/repositories/SqlAvailabilityQueryService';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';

export function createAvailabilityRouter(): Router {
  const router = Router();
  
  // Repositories
  const labProfileRepo = new SqlLabProfileRepository();
  const computerRepo = new SqlComputerRepository();
  const equipmentRepo = new SqlEquipmentRepository();
  const availabilityQueryService = new SqlAvailabilityQueryService();

  // Use Cases
  const checkAvailabilityUseCase = new CheckAvailabilityUseCase(
    labProfileRepo,
    computerRepo,
    equipmentRepo,
    availabilityQueryService
  );

  // Controllers
  const controller = new AvailabilityController(checkAvailabilityUseCase);

  // Routes
  router.post('/check', authMiddleware, requirePermissions('LAB_CALENDAR_VIEW'), controller.check.bind(controller));

  return router;
}
