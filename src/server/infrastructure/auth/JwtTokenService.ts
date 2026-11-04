import jwt from 'jsonwebtoken';
import cryptoNode from 'crypto';
import '../../config/load-environment';
import { ITokenService, TokenPayload } from '../../application/ports/ITokenService';
import { UnauthorizedError } from '../../shared/errors/AppError';

export class JwtTokenService implements ITokenService {
  private accessSecret: string;
  private accessExpiry: string;

  constructor() {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET chưa được cấu hình.');
    this.accessSecret = process.env.JWT_SECRET;
    this.accessExpiry = '15m';
  }

  public generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessSecret, { algorithm: 'HS256', expiresIn: this.accessExpiry as any });
  }


  public verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.accessSecret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || typeof payload.userId !== 'string' || typeof payload.sessionId !== 'string') {
        throw new Error('Missing session identity');
      }
      return payload as TokenPayload;
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
