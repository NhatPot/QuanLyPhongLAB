import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { IDeviceAgentRepository } from '../../../domain/repositories/IDeviceAgentRepository';
import { hashDeviceApiKey, isValidMacAddress, normalizeMacAddress } from '../../../shared/utils/deviceIdentity';
import { DeviceController } from '../controllers/DeviceController';
import { authMiddleware, requirePermissions } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequestMiddleware';

const deviceIdSchema = z.string().trim().min(1).max(100);
const isoDateSchema = z.string().datetime({ offset: true });
const percentageSchema = z.number().min(0).max(100);
const nonNegativeNumberSchema = z.number().nonnegative();

export const registerDeviceSchema = z.object({
  body: z.object({
    device_id: deviceIdSchema,
    hostname: z.string().trim().min(1).max(255),
    os: z.string().trim().max(100).optional(),
    os_version: z.string().trim().max(100).optional(),
    platform: z.string().trim().max(100).optional(),
    arch: z.string().trim().max(100).optional(),
    cpu_model: z.string().trim().max(255).optional(),
    cpu_cores: z.number().int().positive().max(1024).optional(),
    gpu_model: z.string().trim().max(255).optional(),
    gpu: z.string().trim().max(255).optional(),
    gpus: z.array(z.any()).optional(),
    gpu_list: z.array(z.any()).optional(),
    total_ram_gb: z.number().positive().max(1048576).optional(),
    total_disk_gb: z.number().nonnegative().optional(),
    disk_size_gb: z.number().nonnegative().optional(),
    disks: z.array(z.any()).optional(),
    disk_info: z.array(z.any()).optional(),
    mac_address: deviceIdSchema.optional(),
    ip_address: z.string().optional(),
    ip_addresses: z.array(z.string()).optional(),
    ipv4_addresses: z.array(z.string()).optional(),
    uuid: z.string().trim().max(100).optional(),
    status: z.string().optional(),
    device_status: z.string().optional(),
    is_in_use: z.boolean().optional(),
    current_user: z.string().optional(),
    user_token: z.string().optional(),
    registered_at: isoDateSchema.optional(),
    installed_apps: z.union([z.array(z.any()), z.string()]).optional(),
    installed_software: z.union([z.array(z.any()), z.string()]).optional(),
    installedSoftware: z.union([z.array(z.any()), z.string()]).optional(),
    apps: z.union([z.array(z.any()), z.string()]).optional(),
    software: z.union([z.array(z.any()), z.string()]).optional(),
    applications: z.union([z.array(z.any()), z.string()]).optional(),
  }).passthrough().superRefine((body, context) => {
    if (body.device_id && body.mac_address && isValidMacAddress(body.device_id) && isValidMacAddress(body.mac_address)) {
      if (normalizeMacAddress(body.device_id) !== normalizeMacAddress(body.mac_address)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mac_address'],
          message: 'device_id và mac_address phải cùng xác định một thiết bị.',
        });
      }
    }
  }),
});

export const updateMetricsSchema = z.object({
  body: z.object({
    device_id: deviceIdSchema,
    timestamp: isoDateSchema.optional(),
    user_token: z.string().optional(),
    ip_address: z.string().optional(),
    ipAddress: z.string().optional(),
    ip_addresses: z.array(z.string()).optional(),
    ipv4_addresses: z.array(z.string()).optional(),
    status: z.object({
      device_status: z.string().optional(),
      current_user: z.string().optional(),
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
    }).passthrough().optional(),
  }).passthrough(),
});

export const hardwareChangeSchema = z.object({
  body: z.object({
    device_id: deviceIdSchema,
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

export const bindUserSchema = z.object({
  body: z.object({
    device_id: deviceIdSchema,
    user_id: z.string().optional(),
    userId: z.string().optional(),
    username: z.string().optional(),
    full_name: z.string().optional(),
    fullName: z.string().optional(),
    current_user: z.string().optional(),
    status: z.string().optional(),
    login_at: isoDateSchema.optional(),
    loginAt: isoDateSchema.optional(),
    hostname: z.string().optional(),
    ip_address: z.string().optional(),
    ipAddress: z.string().optional(),
    ip_addresses: z.array(z.string()).optional(),
  }).passthrough(),
});

export const unbindUserSchema = z.object({
  body: z.object({
    device_id: deviceIdSchema,
    user_id: z.string().optional(),
    username: z.string().optional(),
    logout_at: isoDateSchema.optional(),
  }).passthrough(),
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
  router.post('/bind-user', validateRequest(bindUserSchema), deviceAuthMiddleware, (req, res) => controller.bindUser(req, res));
  router.post('/unbind-user', validateRequest(unbindUserSchema), deviceAuthMiddleware, (req, res) => controller.unbindUser(req, res));

  return router;
}
