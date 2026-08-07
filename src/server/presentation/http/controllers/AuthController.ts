import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { container } from '../../../container/dependency-container';
import { ApiResponse } from '../presenters/ApiResponse';
import { ValidationError, UnauthorizedError } from '../../../shared/errors/AppError';

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, 'Tên đăng nhập hoặc email không được để trống.'),
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
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const result = await container.loginUseCase.execute({
        identifier,
        password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId
      });

      if (result.isFailure) {
        throw new UnauthorizedError(result.getError() || "Tên đăng nhập hoặc mật khẩu không chính xác.");
      }

      const { accessToken, refreshToken, mustChangePassword } = result.getValue();

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json(
        ApiResponse.success({
          accessToken,
          mustChangePassword
        }, "Đăng nhập thành công.")
      );
    } catch (error) {
      next(error);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedError("Không tìm thấy token phiên mới.");
      }

      const result = await container.refreshSessionUseCase.execute({
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      if (result.isFailure) {
        throw new UnauthorizedError(result.getError() || "Phiên làm việc không hợp lệ.");
      }

      const { accessToken, refreshToken: newRefreshToken } = result.getValue();

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json(
        ApiResponse.success({ accessToken }, "Tạo phiên mới thành công.")
      );
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await container.logoutUseCase.execute({ refreshToken });
      }

      res.clearCookie('refreshToken');
      res.status(200).json(ApiResponse.success(null, "Đăng xuất thành công."));
    } catch (error) {
      next(error);
    }
  }

  public async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new UnauthorizedError("Người dùng chưa được xác thực.");
      }

      const result = await container.getCurrentUserUseCase.execute(userId);
      if (result.isFailure) {
        throw new UnauthorizedError(result.getError() || "Người dùng không tồn tại.");
      }

      res.status(200).json(ApiResponse.success(result.getValue(), "Lấy thông tin thành công."));
    } catch (error) {
      next(error);
    }
  }

  public async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new UnauthorizedError('Người dùng chưa được xác thực.');

      const profile = await container.updateCurrentUserProfileUseCase.execute({
        userId,
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        correlationId: req.correlationId,
      });

      res.status(200).json(ApiResponse.success(profile, 'Cập nhật hồ sơ cá nhân thành công.'));
    } catch (error) {
      next(error);
    }
  }

  public async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const refreshToken = req.cookies.refreshToken;

      if (!userId || !refreshToken) {
        throw new UnauthorizedError("Bạn chưa đăng nhập.");
      }

      const { currentPassword, newPassword } = req.body;
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
        throw new ValidationError(result.getError() || "Thay đổi mật khẩu thất bại.");
      }

      res.status(200).json(ApiResponse.success(null, "Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi."));
    } catch (error) {
      next(error);
    }
  }
}
