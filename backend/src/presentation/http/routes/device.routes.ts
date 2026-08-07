import { z } from 'zod';
import { Router } from 'express';
import { DeviceController } from '../controllers/DeviceController';
import { validateRequest } from '../middlewares/validateRequestMiddleware';
import { Request, Response, NextFunction } from 'express';

export const registerDeviceSchema = z.object({
  body: z.object({
    device_id: z.string().min(1),
    hostname: z.string().min(1),
    os: z.string().optional(),
    os_version: z.string().optional(),
    platform: z.string().optional(),
    arch: z.string().optional(),
    cpu_model: z.string().optional(),
    cpu_cores: z.number().optional(),
    total_ram_gb: z.number().optional(),
    mac_address: z.string().min(1),
    uuid: z.string().optional(),
    registered_at: z.string().optional(),
  })
});

export const updateMetricsSchema = z.object({
  body: z.object({
    device_id: z.string().min(1),
    timestamp: z.string().optional(),
    status: z.object({
      cpu: z.object({
        usage: z.number().optional(),
        cores: z.array(z.number()).optional(),
        temperature: z.number().optional()
      }).optional(),
      ram: z.object({
        used: z.number().optional(),
        total: z.number().optional(),
        free: z.number().optional(),
        usagePercent: z.number().optional()
      }).optional(),
      disk: z.object({
        used: z.number().optional(),
        total: z.number().optional(),
        usagePercent: z.number().optional(),
        partitions: z.array(z.any()).optional()
      }).optional(),
      network: z.any().optional()
    }).optional(),
    installed_apps: z.array(z.object({
      name: z.string(),
      version: z.string().optional(),
      publisher: z.string().optional()
    })).optional()
  })
});

export const hardwareChangeSchema = z.object({
  body: z.object({
    device_id: z.string().min(1),
    alert_type: z.string(),
    timestamp: z.string().optional(),
    changes: z.array(z.object({
      field: z.string(),
      old: z.any(),
      new: z.any()
    })).optional(),
    previous_hardware: z.any().optional(),
    current_hardware: z.any().optional()
  })
});

export function deviceAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || (req.headers['authorization'] || '').replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ status: 'error', message: 'Missing API Key' });
  }
  // Simplified auth for devices. In a real system, validate the API Key.
  // For now, accept it if it's present (or validate against a DB if needed).
  next();
}

export function createDeviceRouter(controller: DeviceController): Router {
  const router = Router();

  router.get('/metrics', (req, res) => controller.getAllMetrics(req, res));
  router.post('/register', validateRequest(registerDeviceSchema), (req, res) => controller.register(req, res));
  router.post('/metrics', deviceAuthMiddleware, validateRequest(updateMetricsSchema), (req, res) => controller.updateMetrics(req, res));
  router.post('/alert-hardware-change', deviceAuthMiddleware, validateRequest(hardwareChangeSchema), (req, res) => controller.alertHardwareChange(req, res));

  return router;
}
