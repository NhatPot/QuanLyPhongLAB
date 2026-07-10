import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { IIdGenerator } from '../../application/ports/IIdGenerator';

export class UuidGenerator implements IIdGenerator {
  public generate(): string {
    return uuidv4();
  }

  public validate(id: string): boolean {
    return uuidValidate(id);
  }
}
