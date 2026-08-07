import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../application/ports/IPasswordHasher';

export class BcryptHasher implements IPasswordHasher {
  private saltRounds = 10;

  public async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  public async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
