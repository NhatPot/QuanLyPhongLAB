export class Result<T> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _error: string | null;
  private readonly _value: T | null;

  private constructor(isSuccess: boolean, error?: string, value?: T) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._error = error ?? null;
    this._value = value ?? null;
  }

  public getError(): string {
    if (this.isSuccess) {
      throw new Error("Cannot get the error of a successful result.");
    }
    return this._error ?? "Unknown error";
  }

  public getValue(): T {
    if (this.isFailure) {
      throw new Error("Cannot get the value of a failure result.");
    }
    return this._value as T;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, undefined, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error);
  }
}
