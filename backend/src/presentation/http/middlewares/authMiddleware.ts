import { Request, Response, NextFunction } from 'express';
import { container } from '../../../container/dependency-container';
import { UnauthorizedError, ForbiddenError } from '../../../shared/errors/AppError';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError("Vui lòng đăng nhập để tiếp tục.");
  }

  const token = authHeader.substring(7);
  try {
    const payload = container.tokenService.verifyAccessToken(token);
    (req as any).user = payload;
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

    const hasPermission = requiredPermissions.every(perm => user.permissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenError("Bạn không có quyền thực hiện hành động này.");
    }

    next();
  };
}
