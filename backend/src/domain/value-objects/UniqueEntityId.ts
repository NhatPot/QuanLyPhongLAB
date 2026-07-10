import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class UniqueEntityId {
  private readonly value: string;

  constructor(id?: string) {
    if (id && !uuidValidate(id)) {
      throw new Error(`Invalid UUID string: ${id}`);
    }
    this.value = id ?? uuidv4();
  }

  public toString(): string {
    return this.value;
  }

  public equals(id?: UniqueEntityId): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    if (!(id instanceof UniqueEntityId)) {
      return false;
    }
    return id.toString() === this.value;
  }
}
