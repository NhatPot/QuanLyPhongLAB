import { Request, Response, NextFunction } from 'express';
import { container } from '../../../container/dependency-container';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/AppError';
import { assertCsrf, expressSecurityRequest } from '../security/web-session';
import { assertAccountSetupAccess } from '../security/account-setup';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    assertCsrf(expressSecurityRequest(req));
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.substring(7) : req.cookies?.accessToken;
    if (!token) throw new UnauthorizedError('Vui lòng đăng nhập để tiếp tục.');
    (req as any).user = await container.validateAccessSessionUseCase.execute(token);
    assertAccountSetupAccess((req as any).user, req.method, req.originalUrl || req.url || '');
    res.setHeader('Cache-Control', 'no-store');
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermissions(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      throw new UnauthorizedError("Người dùng chưa được xác thực.");
    }

    const isAdministrator = Array.isArray(user.roles) && user.roles.includes('ADMIN');
    const hasPermission = isAdministrator || requiredPermissions.every((perm) => user.permissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenError("Bạn không có quyền thực hiện hành động này.");
    }

    next();
  };
}

export function requireAnyPermissions(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) throw new UnauthorizedError('Người dùng chưa được xác thực.');
    const isAdministrator = Array.isArray(user.roles) && user.roles.includes('ADMIN');
    const hasPermission = isAdministrator || requiredPermissions.some((permission) => user.permissions.includes(permission));
    if (!hasPermission) throw new ForbiddenError('Bạn không có quyền thực hiện hành động này.');
    next();
  };
}
