import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { container } from '../../../container/dependency-container';
import { ApiResponse } from '../presenters/ApiResponse';
import { ValidationError, UnauthorizedError } from '../../../shared/errors/AppError';
import { assertCsrf, assertRequestOrigin, clearSessionCookies, expressSecurityRequest, isNativeAuthRequest, protectAuthRequest, setCsrfCookie, setSessionCookies } from '../security/web-session';
import { loginRateLimiter } from '../security/login-rate-limiter';

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Tên đăng nhập hoặc email không được để trống.').optional(),
    username: z.string().min(1, 'Tên đăng nhập hoặc email không được để trống.').optional(),
    password: z.string().min(1, 'Mật khẩu không được để trống.')
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Mật khẩu cũ không được để trống.'),
    newPassword: z.string().min(1, 'Mật khẩu mới không được để trống.')
  })
});

const avatarDataUrlSchema = z.string()
  .max(700_000, 'Ảnh đại diện vượt quá dung lượng cho phép.')
  .regex(
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
    'Ảnh đại diện phải là tệp JPEG, PNG hoặc WebP hợp lệ.',
  );

export const updateCurrentUserProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự.').max(255),
    email: z.string().trim().email('Email không đúng định dạng.').max(255),
    phone: z.string().trim().max(50).optional(),
    department: z.string().trim().max(255).optional(),
    avatarUrl: avatarDataUrlSchema.nullable().optional(),
  }),
});

export class AuthController {
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const native = protectAuthRequest(req);
      const rawIdentifier = req.body?.identifier || req.body?.username;
      const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
      const password = req.body?.password;

      if (!identifier || typeof password !== 'string' || !password) {
        throw new UnauthorizedError('Tên đăng nhập hoặc mật khẩu không được để trống.');
      }
      loginRateLimiter.consume(identifier, req.ip || 'unknown');

      const result = await container.loginUseCase.execute({
        identifier,
        password,
        adminOnly: process.env.FIT_SSO_ENABLED==='true',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId
      });

      if (result.isFailure) {
        throw new UnauthorizedError(result.getError() || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }

      const { accessToken, refreshToken, mustChangePassword, refreshExpiresAt } = result.getValue();
      const payload = container.tokenService.verifyAccessToken(accessToken) as { userId: string };
      const userResult = await container.getCurrentUserUseCase.execute(payload.userId);
      const userProfile = userResult.isSuccess ? userResult.getValue() : null;

      res.setHeader('Cache-Control', 'no-store');
      const csrfToken = native ? undefined : setSessionCookies(res, accessToken, refreshToken, refreshExpiresAt);

      // Auto-bind device if device_id is passed in login request from Agent
      const deviceId = req.body?.device_id || req.body?.deviceId;
      if (deviceId && userProfile) {
        try {
          await container.bindUserDeviceUseCase.execute({
            device_id: deviceId,
            user_id: userProfile.id,
            username: userProfile.username,
            full_name: userProfile.fullName,
          });
        } catch {
          // Ignore bind error if device not registered yet
        }
      }

      res.status(200).json({
        status: 'success',
        message: 'Đăng nhập người dùng thành công',
        ...(native ? { token: accessToken, accessToken, refreshToken } : {}),
        mustChangePassword,
        user: userProfile ? {
          user_id: userProfile.id,
          username: userProfile.username,
          full_name: userProfile.fullName,
          email: userProfile.email,
          role: userProfile.roles[0] || 'user'
        } : null,
        data: {
          ...(native ? { accessToken, refreshToken } : { csrfToken }),
          mustChangePassword,
          user: userProfile
        }
      });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 429) res.setHeader('Retry-After', '900');
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const native = protectAuthRequest(req);
      const refreshToken = native ? req.body?.refreshToken : req.cookies?.refreshToken;
      if (typeof refreshToken !== 'string' || !refreshToken) {
        throw new UnauthorizedError('Không tìm thấy token phiên mới.');
      }

      const result = await container.refreshSessionUseCase.execute({
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      if (result.isFailure) {
        throw new UnauthorizedError(result.getError() || 'Phiên làm việc không hợp lệ.');
      }

      const { accessToken, refreshToken: newRefreshToken, refreshExpiresAt } = result.getValue();
      res.setHeader('Cache-Control', 'no-store');
      const csrfToken = native ? undefined : setSessionCookies(res, accessToken, newRefreshToken, refreshExpiresAt);

      res.status(200).json(
        ApiResponse.success(native ? { accessToken, refreshToken: newRefreshToken } : { csrfToken }, 'Tạo phiên mới thành công.')
      );
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const security = expressSecurityRequest(req);
      assertCsrf(security);
      const native = isNativeAuthRequest(security) && !security.refreshToken && !security.accessToken;
      const refreshToken = native ? req.body?.refreshToken : req.cookies?.refreshToken;
      const result = await container.logoutUseCase.execute({ refreshToken, userId: req.user?.userId, sessionId: (req.user as any)?.sessionId });
      if (result.isFailure) throw new UnauthorizedError(result.getError());
      clearSessionCookies(res);
      res.status(200).json(ApiResponse.success(null, 'Đăng xuất thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public csrf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      assertRequestOrigin(expressSecurityRequest(req));
      res.status(200).json(ApiResponse.success({ csrfToken: setCsrfCookie(res, req.cookies?.refreshToken) }));
    } catch (error) { next(error); }
  };

  public logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      assertCsrf(expressSecurityRequest(req));
      if (!req.user?.userId) throw new UnauthorizedError();
      await container.logoutAllSessionsUseCase.execute(req.user.userId);
      clearSessionCookies(res);
      res.status(200).json(ApiResponse.success(null, 'Đã đăng xuất tất cả thiết bị.'));
    } catch (error) { next(error); }
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new UnauthorizedError('Người dùng chưa được xác thực.');
      }

      const result = await container.getCurrentUserUseCase.execute(userId,!!(req.user as any)?.usesSso);
      if (result.isFailure) {
        throw new UnauthorizedError(result.getError() || 'Người dùng không tồn tại.');
      }

      res.status(200).json(ApiResponse.success(result.getValue(), 'Lấy thông tin thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Người dùng chưa được xác thực.');

      const profile = await container.updateCurrentUserProfileUseCase.execute({
        ...req.body,
        userId,
        usesSso: !!(req.user as any)?.usesSso,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        correlationId: req.correlationId,
      });

      res.status(200).json(ApiResponse.success(profile, 'Cập nhật hồ sơ cá nhân thành công.'));
    } catch (error) {
      next(error);
    }
  };

  public changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      const refreshToken = req.cookies.refreshToken;

      if (!userId || !refreshToken) {
        throw new UnauthorizedError('Bạn chưa đăng nhập.');
      }

      const { currentPassword, newPassword } = req.body;
      if((req.user as any)?.usesSso)throw new ValidationError('Vui lòng đổi mật khẩu tại FIT LHU SSO.');
      const result = await container.changePasswordUseCase.execute({
        userId,
        currentPasswordHashOrText: currentPassword,
        newPasswordText: newPassword,
        activeRefreshToken: refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId
      });

      if (result.isFailure) {
        throw new ValidationError(result.getError() || 'Thay đổi mật khẩu thất bại.');
      }

      res.status(200).json(ApiResponse.success(null, 'Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi.'));
    } catch (error) {
      next(error);
    }
  };
}
