export interface TokenPayload {
  userId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
}

export interface ITokenService {
  generateAccessToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
  generateRefreshToken(): string;
}
