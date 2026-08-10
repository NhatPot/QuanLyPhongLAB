import jwt from 'jsonwebtoken';
import cryptoNode from 'crypto';
import '../../config/load-environment';
import { ITokenService, TokenPayload } from '../../application/ports/ITokenService';
import { UnauthorizedError } from '../../shared/errors/AppError';

export class JwtTokenService implements ITokenService {
  private accessSecret: string;
  private refreshSecret: string;
  private accessExpiry: string;

  constructor() {
    this.accessSecret = process.env.JWT_SECRET || 'super-secret-jwt-key';
    this.refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'super-secret-refresh-key';
    this.accessExpiry = process.env.JWT_EXPIRATION || '15m';
  }

  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessExpiry as any });
  }


  public verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessSecret) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Token access đã hết hạn.", "TOKEN_EXPIRED");
      }
      throw new UnauthorizedError("Token access không hợp lệ.");
    }
  }

  public generateRefreshToken(): string {
    return cryptoNode.randomBytes(40).toString('hex');
  }
}
