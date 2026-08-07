import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

export function createHealthRouter(healthController: HealthController): Router {
  const router = Router();
  router.get('/health', healthController.getHealth);
  return router;
}
