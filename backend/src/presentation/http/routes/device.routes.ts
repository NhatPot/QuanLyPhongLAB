import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { hashDeviceApiKey, isValidMacAddress, normalizeMacAddress } from '../../../shared/utils/deviceIdentity';
import { DeviceController } from '../controllers/DeviceController';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const macAddressSchema = z.string().trim().refine(isValidMacAddress, 'Địa chỉ MAC không đúng định dạng.');
const isoDateSchema = z.string().datetime({ offset: true });
const percentageSchema = z.number().min(0).max(100);
const nonNegativeNumberSchema = z.number().nonnegative();

export const registerDeviceSchema = z.object({
  body: z.object({
    device_id: macAddressSchema,
    hostname: z.string().trim().min(1).max(255),
    os: z.string().trim().max(100).optional(),
    os_version: z.string().trim().max(100).optional(),
    platform: z.string().trim().max(100).optional(),
    arch: z.string().trim().max(100).optional(),
    cpu_model: z.string().trim().max(255).optional(),
    cpu_cores: z.number().int().positive().max(1024).optional(),
    total_ram_gb: z.number().positive().max(1048576).optional(),
    mac_address: macAddressSchema,
    uuid: z.string().trim().max(100).optional(),
    registered_at: isoDateSchema.optional(),
  }).superRefine((body, context) => {
    if (normalizeMacAddress(body.device_id) !== normalizeMacAddress(body.mac_address)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mac_address'],
        message: 'device_id và mac_address phải cùng xác định một thiết bị.',
      });
    }
  }),
});

export const updateMetricsSchema = z.object({
  body: z.object({
    device_id: macAddressSchema,
    timestamp: isoDateSchema.optional(),
    status: z.object({
      cpu: z.object({
        usage: percentageSchema.optional(),
        cores: z.array(percentageSchema).max(1024).optional(),
        temperature: z.number().min(-100).max(300).optional(),
      }).optional(),
      ram: z.object({
        used: nonNegativeNumberSchema.optional(),
        total: nonNegativeNumberSchema.optional(),
        free: nonNegativeNumberSchema.optional(),
        usagePercent: percentageSchema.optional(),
      }).optional(),
      disk: z.object({
        used: nonNegativeNumberSchema.optional(),
        total: nonNegativeNumberSchema.optional(),
        usagePercent: percentageSchema.optional(),
        partitions: z.array(z.unknown()).max(256).optional(),
      }).optional(),
      network: z.record(z.unknown()).optional(),
    }).optional(),
    installed_apps: z.array(z.object({
      name: z.string().trim().min(1).max(500),
      version: z.string().trim().max(100).optional(),
      publisher: z.string().trim().max(255).optional(),
    })).max(10000).optional(),
  }),
});

export const hardwareChangeSchema = z.object({
  body: z.object({
    device_id: macAddressSchema,
    alert_type: z.literal('HARDWARE_CHANGED'),
    timestamp: isoDateSchema.optional(),
    changes: z.array(z.object({
      field: z.string().trim().min(1).max(255),
      old: z.unknown(),
      new: z.unknown(),
    })).max(100).optional(),
    previous_hardware: z.unknown().optional(),
    current_hardware: z.unknown().optional(),
  }),
});

function extractApiKey(req: Request): string | null {
  const headerKey = req.header('x-api-key')?.trim();
  const authorization = req.header('authorization')?.trim();
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const bearerKey = bearerMatch?.[1]?.trim();

  if (headerKey && bearerKey && headerKey !== bearerKey) return null;
  return headerKey || bearerKey || null;
}

export function createDeviceAuthMiddleware(deviceAgentRepo: IDeviceAgentRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const apiKey = extractApiKey(req);
      if (!apiKey) {
        res.status(401).json({ status: 'error', message: 'API key bị thiếu hoặc hai header không khớp.' });
        return;
      }

      const agent = await deviceAgentRepo.findByApiKeyHash(hashDeviceApiKey(apiKey));
      if (!agent) {
        res.status(401).json({ status: 'error', message: 'API key không hợp lệ hoặc đã bị thay thế.' });
        return;
      }

      const requestDeviceId = req.body?.device_id;
      if (!requestDeviceId || normalizeMacAddress(requestDeviceId) !== agent.deviceId) {
        res.status(403).json({ status: 'error', message: 'API key không thuộc thiết bị này.' });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createDeviceRegistrationMiddleware(deviceAgentRepo: IDeviceAgentRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deviceId = normalizeMacAddress(req.body.device_id);
      const existingAgent = await deviceAgentRepo.findByDeviceId(deviceId);
      if (!existingAgent) {
        next();
        return;
      }

      const apiKey = extractApiKey(req);
      if (!apiKey || hashDeviceApiKey(apiKey) !== existingAgent.apiKeyHash) {
        res.status(401).json({
          status: 'error',
          message: 'Thiết bị đã đăng ký. Cần API key hiện tại để đăng ký lại.',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function createDeviceRouter(controller: DeviceController, deviceAgentRepo: IDeviceAgentRepository): Router {
  const router = Router();
  const deviceAuthMiddleware = createDeviceAuthMiddleware(deviceAgentRepo);
  const deviceRegistrationMiddleware = createDeviceRegistrationMiddleware(deviceAgentRepo);

  router.get('/metrics', authMiddleware, requirePermissions('COMPUTER_VIEW'), (req, res) => controller.getAllMetrics(req, res));
  router.post('/register', validateRequest(registerDeviceSchema), deviceRegistrationMiddleware, (req, res) => controller.register(req, res));
  router.post('/metrics', validateRequest(updateMetricsSchema), deviceAuthMiddleware, (req, res) => controller.updateMetrics(req, res));
  router.post('/alert-hardware-change', validateRequest(hardwareChangeSchema), deviceAuthMiddleware, (req, res) => controller.alertHardwareChange(req, res));

  return router;
}
