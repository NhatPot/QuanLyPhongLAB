export interface AuthSessionProps {
  id?: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface IAuthSessionRepository {
  findById(id: string): Promise<AuthSessionProps | null>;
  findByHash(hash: string): Promise<AuthSessionProps | null>;
  save(session: AuthSessionProps, transaction?: any): Promise<void>;
  revokeByUserId(userId: string, transaction?: any): Promise<void>;
  revokeAllExcept(userId: string, activeSessionId: string, transaction?: any): Promise<void>;
}
